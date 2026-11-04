"""
CardioScan Distributed Rate Limiting & Abuse Prevention Engine (SEC-05)
======================================================================

Provides distributed sliding-window rate limiting backed by Redis with atomic
Lua script execution across multi-worker and horizontal container replicas.

Deployment Scope & Security Architecture:
-----------------------------------------
1. Distributed Redis Enforcement:
   - State is shared across all Uvicorn workers and container replicas via Redis.
   - Atomicity is guaranteed using a Redis Lua script running ZSET operations
     (ZREMRANGEBYSCORE, ZCARD, ZRANGE WITHSCORES, ZADD, EXPIRE).
   - Eliminates race conditions between concurrent requests across workers.
   - Keys are scoped under the 'cardioscan:ratelimit:' namespace with automatic TTLs.

2. Explicit Production Failure Strategy (Fail-Closed):
   - In production (settings.is_production):
     When Redis is unreachable or fails, requests fail closed with HTTP 503 Service Unavailable.
     Silent fallback to process-local in-memory storage is strictly disallowed to prevent
     attackers from multiplying quota by distributing traffic across workers during Redis outages.
   - In development/testing:
     Falls back safely to InMemoryRateLimiterStorage if REDIS_URL is not configured.
   - Operational failures are logged with sanitized URLs; credentials and passwords are NEVER logged.

3. Anti-IP-Spoofing Architecture:
   - Arbitrary client-supplied X-Forwarded-For headers are NEVER trusted blindly at index 0.
   - When TRUSTED_PROXY_HOPS >= 1 (e.g. Render/production reverse proxy topology):
     Extracts client IP from index -TRUSTED_PROXY_HOPS (the rightmost IP appended by
     the trusted reverse proxy), safely ignoring attacker-injected header prefixes.
   - When TRUSTED_PROXY_HOPS == 0 (local dev / direct socket connection):
     Forwarding headers are disregarded entirely; direct socket peer IP (request.client.host) is used.

4. Authenticated User Identity Keying:
   - For authenticated endpoints, limits are keyed primarily by stable authenticated user_id,
     preventing users on shared NAT/campus networks from consuming each other's quota.
   - A secondary defensible IP-level abuse limit is enforced in tandem to mitigate socket flooding.
"""

from collections import deque
import logging
import re
import threading
import time
from typing import Callable, Dict, Optional, Tuple, Union
import urllib.parse
import uuid

from fastapi import HTTPException, Request, status
import redis
from app.core.config import settings
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

# Atomic sliding window rate limiter Lua script
# KEYS[1]: rate limit key, e.g. "cardioscan:ratelimit:login:ip:1.2.3.4"
# ARGV[1]: window_seconds (integer as string)
# ARGV[2]: max_requests (integer as string)
# ARGV[3]: unique request member ID (string)
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])
local member = ARGV[3]

-- Authoritative server-side time from Redis TIME (SEC-05.1 / F-01)
local redis_time = redis.call('TIME')
local now = tonumber(redis_time[1]) + (tonumber(redis_time[2]) / 1000000)
local cutoff = now - window

-- 1. Remove expired timestamps outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- 2. Count requests in active window
local current_count = redis.call('ZCARD', key)

if current_count >= max_requests then
    -- Rate limit exceeded. Calculate retry_after from oldest timestamp in active window.
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 1
    if oldest and #oldest >= 2 then
        local oldest_ts = tonumber(oldest[2])
        retry_after = math.max(1, math.ceil(oldest_ts + window - now))
    else
        retry_after = math.max(1, math.ceil(window))
    end
    -- Refresh TTL so key doesn't expire during active throttled requests
    redis.call('EXPIRE', key, math.ceil(window * 2))
    return {0, retry_after}
else
    -- Request allowed. Add new member with timestamp as score
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window * 2))
    return {1, 0}
end
"""


def sanitize_redis_url(url: Optional[str]) -> str:
    """Mask credentials in Redis connection URLs for safe diagnostic logging."""
    if not url:
        return "<not-configured>"
    raw_str = str(url).strip()
    if not raw_str:
        return "<not-configured>"

    # If no URL scheme separator '://' is present, check for direct credential masking
    if "://" not in raw_str:
        if "@" in raw_str:
            _, _, hostport = raw_str.rpartition("@")
            return f"***:***@{hostport}"
        return raw_str

    try:
        parsed = urllib.parse.urlsplit(raw_str)
        netloc = parsed.netloc
        if "@" in netloc:
            _, _, hostport = netloc.rpartition("@")
            sanitized_netloc = f"***:***@{hostport}"
            return urllib.parse.urlunsplit((
                parsed.scheme,
                sanitized_netloc,
                parsed.path,
                parsed.query,
                parsed.fragment,
            ))
        return parsed.geturl()
    except Exception:
        pass

    # Defensive fallback for any malformed URL containing an '@'
    if "@" in raw_str:
        userinfo_part, _, host_part = raw_str.rpartition("@")
        if "://" in userinfo_part:
            scheme, _, _ = userinfo_part.partition("://")
            return f"{scheme}://***:***@{host_part}"
        return f"***:***@{host_part}"

    return raw_str


class RateLimiterUnavailableError(Exception):
    """Raised when distributed rate limiter is unreachable and cannot safely enforce policy."""
    pass


def get_client_ip(request: Request) -> str:
    """
    Extract trustworthy client IP address based on deployment proxy topology.

    Anti-Spoofing Logic:
    - Never blindly trust the leftmost X-Forwarded-For value (client-controlled).
    - When TRUSTED_PROXY_HOPS >= 1 (e.g. Render production with 1 reverse proxy):
      Each trusted proxy appends the connecting client IP to the end of X-Forwarded-For.
      The trustworthy client IP is located at index -TRUSTED_PROXY_HOPS in the list.
    - When TRUSTED_PROXY_HOPS == 0 (direct connection / test / untrusted proxy):
      X-Forwarded-For is disregarded; direct socket peer IP (request.client.host) is used.
    """
    if not request:
        return "127.0.0.1"

    peer_ip = request.client.host if request.client and request.client.host else "127.0.0.1"
    hops = getattr(settings, "TRUSTED_PROXY_HOPS", 1)

    if hops > 0:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
            if len(ips) >= hops:
                return ips[-hops]
            elif ips:
                return ips[0]

    return peer_ip


def extract_user_id_from_request(request: Request) -> Optional[str]:
    """Extract authenticated user ID from Authorization Bearer token if present."""
    if not request:
        return None
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        try:
            payload = decode_access_token(token)
            if payload and payload.get("sub"):
                return str(payload["sub"])
        except Exception:
            return None
    return None


class BaseRateLimiterStorage:
    """Interface for rate limiter storage backends."""

    def check_and_record(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        now: Optional[float] = None,
    ) -> Tuple[bool, int]:
        raise NotImplementedError

    def reset(self) -> None:
        raise NotImplementedError

    def close(self) -> None:
        pass


class InMemoryRateLimiterStorage(BaseRateLimiterStorage):
    """Thread-safe in-memory sliding window rate limiter storage for development and testing."""

    def __init__(self):
        self._lock = threading.Lock()
        self._records: Dict[str, deque] = {}
        self._last_cleanup = time.time()

    def check_and_record(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        now: Optional[float] = None,
    ) -> Tuple[bool, int]:
        """
        Check if request under key is allowed within the sliding window.
        Returns:
            (is_allowed: bool, retry_after_seconds: int)
        """
        if now is None:
            now = time.time()

        with self._lock:
            # Periodic cleanup of idle keys every 5 minutes
            if now - self._last_cleanup > 300:
                self._cleanup(now)
                self._last_cleanup = now

            timestamps = self._records.setdefault(key, deque())

            # Evict timestamps older than the sliding window
            cutoff = now - window_seconds
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= max_requests:
                # Rate limit exceeded. Compute seconds until oldest request expires.
                oldest = timestamps[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                return False, retry_after

            # Record this request timestamp
            timestamps.append(now)
            return True, 0

    def _cleanup(self, now: float) -> None:
        """Purge idle records older than 1 hour to prevent memory growth."""
        keys_to_remove = []
        for k, dq in self._records.items():
            if not dq or dq[-1] < now - 3600:
                keys_to_remove.append(k)
        for k in keys_to_remove:
            del self._records[k]

    def reset(self) -> None:
        """Clear all stored rate limit records (primarily for testing)."""
        with self._lock:
            self._records.clear()

    def close(self) -> None:
        self.reset()


class RedisRateLimiterStorage(BaseRateLimiterStorage):
    """
    Distributed sliding window rate limiter storage backed by Redis with atomic Lua script execution.
    """

    def __init__(
        self,
        redis_url: str,
        max_connections: int = 50,
        socket_timeout: float = 1.0,
        socket_connect_timeout: float = 1.0,
        client: Optional[redis.Redis] = None,
    ):
        self.redis_url = redis_url
        self._max_connections = max_connections
        self._socket_timeout = socket_timeout
        self._socket_connect_timeout = socket_connect_timeout

        if client is not None:
            self._client = client
        else:
            self._pool = redis.ConnectionPool.from_url(
                redis_url,
                max_connections=max_connections,
                socket_timeout=socket_timeout,
                socket_connect_timeout=socket_connect_timeout,
                decode_responses=True,
            )
            self._client = redis.Redis(connection_pool=self._pool, decode_responses=True)

        self._lua_script = self._client.register_script(SLIDING_WINDOW_LUA)

    def ping(self) -> bool:
        """Verify connectivity and authentication to Redis server using PING (SEC-05.1 / F-02)."""
        exc_type_name: Optional[str] = None
        try:
            return bool(self._client.ping())
        except redis.RedisError as exc:
            exc_type_name = type(exc).__name__
            logger.error(
                "Redis PING failed [%s]: %s",
                exc_type_name,
                sanitize_redis_url(self.redis_url),
            )

        if exc_type_name:
            raise RateLimiterUnavailableError(f"Redis ping failed: {exc_type_name}") from None

    def check_and_record(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        now: Optional[float] = None,
    ) -> Tuple[bool, int]:
        full_key = f"cardioscan:ratelimit:{key}"
        # Unique member to prevent collisions in Redis ZSET
        member = uuid.uuid4().hex[:16]

        exc_type_name: Optional[str] = None
        try:
            res = self._lua_script(
                keys=[full_key],
                args=[str(window_seconds), str(max_requests), member],
            )
            is_allowed = bool(res[0])
            retry_after = int(res[1])
            return is_allowed, retry_after
        except (redis.RedisError, IndexError, TypeError, ValueError) as exc:
            exc_type_name = type(exc).__name__
            logger.error(
                "Redis rate limiter execution failure [%s] on key '%s'",
                exc_type_name,
                key,
            )

        if exc_type_name:
            raise RateLimiterUnavailableError(f"Redis rate limiter error: {exc_type_name}") from None

    def reset(self) -> None:
        """Clear all cardioscan rate limit keys (for testing)."""
        try:
            cursor = 0
            while True:
                cursor, keys = self._client.scan(cursor=cursor, match="cardioscan:ratelimit:*", count=100)
                if keys:
                    self._client.delete(*keys)
                if cursor == 0:
                    break
        except redis.RedisError as exc:
            logger.warning("Redis reset note [%s]", type(exc).__name__)

    def close(self) -> None:
        """Close Redis connection resources."""
        try:
            self._client.close()
        except Exception:
            pass


class DistributedRateLimiterStorage(BaseRateLimiterStorage):
    """
    Coordinates distributed rate limiting backend based on environment:
    - Production: Strictly requires Redis (RedisRateLimiterStorage). Fails closed (503) if unavailable.
    - Development/Test: Redis if configured; falls back safely to InMemoryRateLimiterStorage.
    """

    def __init__(self):
        self._memory_storage = InMemoryRateLimiterStorage()
        self._redis_storage: Optional[RedisRateLimiterStorage] = None
        self._init_lock = threading.Lock()

    def _get_active_redis_storage(self) -> Optional[RedisRateLimiterStorage]:
        """Lazily initialize Redis storage if configured."""
        redis_url = getattr(settings, "REDIS_URL", None)
        if not redis_url:
            return None

        if self._redis_storage is None:
            with self._init_lock:
                if self._redis_storage is None:
                    init_exc_name: Optional[str] = None
                    try:
                        self._redis_storage = RedisRateLimiterStorage(
                            redis_url=redis_url,
                            max_connections=getattr(settings, "REDIS_MAX_CONNECTIONS", 50),
                            socket_timeout=getattr(settings, "REDIS_SOCKET_TIMEOUT", 1.0),
                            socket_connect_timeout=getattr(settings, "REDIS_CONNECT_TIMEOUT", 1.0),
                        )
                    except Exception as e:
                        init_exc_name = type(e).__name__
                        logger.error("Failed to initialize Redis rate limiter storage [%s]", init_exc_name)
                        if not settings.is_production:
                            return None

                    if init_exc_name and settings.is_production:
                        raise RateLimiterUnavailableError(f"Cannot initialize production Redis: {init_exc_name}") from None
        return self._redis_storage

    def startup_check(self) -> None:
        """
        Eagerly verify distributed rate limiter backend connectivity during application startup (SEC-05.1 / F-02).
        In production: strictly validates Redis configuration and executes PING.
        Aborts startup if Redis is unreachable or credentials fail.
        In development/test: logs status; falls back safely to in-memory storage if Redis is unconfigured or unreachable.
        """
        if settings.is_production and settings.RATE_LIMIT_ENABLED:
            redis_url = getattr(settings, "REDIS_URL", None)
            if not redis_url:
                raise RateLimiterUnavailableError(
                    "Production distributed rate limiter requires REDIS_URL to be configured."
                )
            redis_storage = self._get_active_redis_storage()
            if not redis_storage:
                raise RateLimiterUnavailableError(
                    "Could not initialize Redis storage pool in production."
                )
            ping_exc_name: Optional[str] = None
            try:
                redis_storage.ping()
            except Exception as exc:
                ping_exc_name = type(exc).__name__

            if ping_exc_name:
                sanitized = sanitize_redis_url(redis_url)
                raise RuntimeError(
                    f"Production Redis rate limiter startup verification failed for {sanitized}: {ping_exc_name}"
                ) from None
        elif settings.RATE_LIMIT_ENABLED:
            if getattr(settings, "REDIS_URL", None):
                try:
                    storage = self._get_active_redis_storage()
                    if storage:
                        storage.ping()
                        logger.info("Connected to development Redis: %s", sanitize_redis_url(settings.REDIS_URL))
                except Exception as dev_err:
                    logger.warning(
                        "Development Redis unreachable (%s). Using in-memory rate limiter.",
                        type(dev_err).__name__,
                    )

    def check_and_record(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        now: Optional[float] = None,
    ) -> Tuple[bool, int]:
        redis_storage = self._get_active_redis_storage()

        if settings.is_production:
            # Production strict failure policy: Fail-closed if Redis is not configured or fails
            if not redis_storage:
                logger.critical("Production distributed rate limiter unavailable: REDIS_URL not configured")
                raise RateLimiterUnavailableError("Distributed rate limiter is not configured in production")

            unexpected_exc_name: Optional[str] = None
            try:
                return redis_storage.check_and_record(key, max_requests, window_seconds, now=now)
            except RateLimiterUnavailableError:
                # Re-raise to trigger HTTP 503 fail-closed behavior
                raise
            except Exception as exc:
                unexpected_exc_name = type(exc).__name__
                logger.critical("Production Redis rate limiter unexpected error [%s]", unexpected_exc_name)

            if unexpected_exc_name:
                raise RateLimiterUnavailableError(f"Redis rate limiter unexpected error: {unexpected_exc_name}") from None
        else:
            # Development / Testing environment
            if redis_storage:
                try:
                    return redis_storage.check_and_record(key, max_requests, window_seconds, now=now)
                except Exception as exc:
                    logger.warning("Redis unavailable in dev/test (%s). Falling back to in-memory limiter.", type(exc).__name__)
                    return self._memory_storage.check_and_record(key, max_requests, window_seconds, now=now)
            return self._memory_storage.check_and_record(key, max_requests, window_seconds, now=now)

    def reset(self) -> None:
        """Reset rate limiters across in-memory and Redis."""
        self._memory_storage.reset()
        if self._redis_storage:
            try:
                self._redis_storage.reset()
            except Exception:
                pass

    def close(self) -> None:
        """Close active storage resources."""
        self._memory_storage.close()
        if self._redis_storage:
            try:
                self._redis_storage.close()
            except Exception:
                pass
            self._redis_storage = None


# Global singleton storage proxy
rate_limiter_storage = DistributedRateLimiterStorage()


class RateLimiter:
    """
    FastAPI dependency callable that enforces sliding-window rate limits.
    Returns HTTP 429 Too Many Requests with standard Retry-After header upon violation.
    Returns HTTP 503 Service Unavailable in production when distributed rate limiter is down (fail-closed).

    Supports:
    - User-identity keying for authenticated requests with a secondary defensible IP limit.
    - Anti-spoofing IP extraction for unauthenticated requests.
    """

    def __init__(
        self,
        key_prefix: str,
        limit: Union[int, Callable[[], int]] = 10,
        window_seconds: Union[int, Callable[[], int]] = 60,
        prefer_user_identity: bool = False,
        ip_limit_multiplier: int = 3,
    ):
        self.key_prefix = key_prefix
        self._limit = limit
        self._window_seconds = window_seconds
        self.prefer_user_identity = prefer_user_identity
        self.ip_limit_multiplier = ip_limit_multiplier

    @property
    def limit(self) -> int:
        if callable(self._limit):
            return self._limit()
        return self._limit

    @property
    def window_seconds(self) -> int:
        if callable(self._window_seconds):
            return self._window_seconds()
        return self._window_seconds

    def __call__(self, request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        client_ip = get_client_ip(request)
        max_req = self.limit
        win_sec = self.window_seconds

        user_id = extract_user_id_from_request(request) if self.prefer_user_identity else None

        storage_unavailable = False
        storage_err_type: Optional[str] = None
        try:
            if user_id:
                # 1. Primary check: key by authenticated user identity
                user_key = f"{self.key_prefix}:user:{user_id}"
                allowed, retry_after = rate_limiter_storage.check_and_record(
                    user_key, max_req, win_sec
                )
                if not allowed:
                    logger.warning(
                        "User rate limit exceeded for user_id=%s on '%s': %d req in %ds. Retry-After: %ds",
                        user_id,
                        self.key_prefix,
                        max_req,
                        win_sec,
                        retry_after,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "Too many requests. Please try again later.",
                            "detail": f"Account rate limit of {max_req} requests per {win_sec}s exceeded. Please wait {retry_after} second(s).",
                            "retry_after": retry_after,
                        },
                        headers={"Retry-After": str(retry_after)},
                    )

                # 2. Secondary check: defensible IP abuse limit to prevent socket flooding
                ip_key = f"{self.key_prefix}:ip_abuse:{client_ip}"
                ip_max = max(max_req * self.ip_limit_multiplier, 30)
                ip_allowed, ip_retry_after = rate_limiter_storage.check_and_record(
                    ip_key, ip_max, win_sec
                )
                if not ip_allowed:
                    logger.warning(
                        "IP flood limit exceeded for %s on '%s': %d req in %ds. Retry-After: %ds",
                        client_ip,
                        self.key_prefix,
                        ip_max,
                        win_sec,
                        ip_retry_after,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "Too many requests. Please try again later.",
                            "detail": f"Network rate limit exceeded. Please wait {ip_retry_after} second(s).",
                            "retry_after": ip_retry_after,
                        },
                        headers={"Retry-After": str(ip_retry_after)},
                    )
            else:
                # Key by client IP for unauthenticated requests
                key = f"{self.key_prefix}:ip:{client_ip}"
                allowed, retry_after = rate_limiter_storage.check_and_record(
                    key, max_req, win_sec
                )
                if not allowed:
                    logger.warning(
                        "Rate limit exceeded for %s on endpoint '%s': %d requests in %ds. Retry-After: %ds",
                        client_ip,
                        self.key_prefix,
                        max_req,
                        win_sec,
                        retry_after,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "Too many requests. Please try again later.",
                            "detail": f"Rate limit of {max_req} requests per {win_sec}s exceeded. Please wait {retry_after} second(s).",
                            "retry_after": retry_after,
                        },
                        headers={"Retry-After": str(retry_after)},
                    )
        except RateLimiterUnavailableError as err:
            storage_unavailable = True
            storage_err_type = type(err).__name__
            logger.error(
                "Rate limiter enforcement failed due to storage unavailability [%s]",
                storage_err_type,
            )

        if storage_unavailable:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "Service temporarily unavailable. Please try again later.",
                    "detail": "Rate limiting service temporarily unavailable.",
                    "code": "rate_limiter_unavailable",
                },
            ) from None


# Pre-configured endpoint dependencies matching application security policy
rate_limit_login = RateLimiter(
    "login",
    limit=lambda: settings.RATE_LIMIT_LOGIN,
    window_seconds=lambda: settings.RATE_LIMIT_LOGIN_WINDOW,
)

rate_limit_register = RateLimiter(
    "register",
    limit=lambda: settings.RATE_LIMIT_REGISTER,
    window_seconds=lambda: settings.RATE_LIMIT_REGISTER_WINDOW,
)

rate_limit_predict = RateLimiter(
    "predict",
    limit=lambda: settings.RATE_LIMIT_PREDICT,
    window_seconds=lambda: settings.RATE_LIMIT_PREDICT_WINDOW,
    prefer_user_identity=True,
)

rate_limit_whatif = RateLimiter(
    "whatif",
    limit=lambda: settings.RATE_LIMIT_WHATIF,
    window_seconds=lambda: settings.RATE_LIMIT_WHATIF_WINDOW,
)

rate_limit_chat = RateLimiter(
    "chat",
    limit=lambda: settings.RATE_LIMIT_CHAT,
    window_seconds=lambda: settings.RATE_LIMIT_CHAT_WINDOW,
    prefer_user_identity=True,
)

rate_limit_forgot_password = RateLimiter(
    "forgot_password",
    limit=lambda: settings.RATE_LIMIT_FORGOT_PASSWORD,
    window_seconds=lambda: settings.RATE_LIMIT_FORGOT_PASSWORD_WINDOW,
)

rate_limit_reset_password = RateLimiter(
    "reset_password",
    limit=lambda: settings.RATE_LIMIT_RESET_PASSWORD,
    window_seconds=lambda: settings.RATE_LIMIT_RESET_PASSWORD_WINDOW,
)

rate_limit_google = RateLimiter(
    "google",
    limit=lambda: settings.RATE_LIMIT_GOOGLE,
    window_seconds=lambda: settings.RATE_LIMIT_GOOGLE_WINDOW,
)

rate_limit_turnstile = RateLimiter(
    "turnstile",
    limit=lambda: settings.RATE_LIMIT_TURNSTILE,
    window_seconds=lambda: settings.RATE_LIMIT_TURNSTILE_WINDOW,
)

rate_limit_reports = RateLimiter(
    "reports",
    limit=lambda: getattr(settings, "RATE_LIMIT_REPORTS", 30),
    window_seconds=lambda: getattr(settings, "RATE_LIMIT_REPORTS_WINDOW", 60),
)

rate_limit_logout = RateLimiter(
    "logout",
    limit=lambda: getattr(settings, "RATE_LIMIT_LOGOUT", 20),
    window_seconds=lambda: getattr(settings, "RATE_LIMIT_LOGOUT_WINDOW", 60),
    prefer_user_identity=True,
)

rate_limit_change_password = RateLimiter(
    "change_password",
    limit=lambda: getattr(settings, "RATE_LIMIT_CHANGE_PASSWORD", 5),
    window_seconds=lambda: getattr(settings, "RATE_LIMIT_CHANGE_PASSWORD_WINDOW", 60),
    prefer_user_identity=True,
)
