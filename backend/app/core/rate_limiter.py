"""
CardioScan In-Memory Rate Limiting & Abuse Prevention Engine
=============================================================

Provides thread-safe in-memory sliding-window rate limiting for security-critical
and resource-heavy endpoints.

Deployment Scope & Limitations:
-------------------------------
1. Single-Process In-Memory Enforcement:
   - Stored in process memory via `InMemoryRateLimiterStorage`.
   - Thread-safe via Python `threading.Lock()`.
   - No Redis adapter, distributed cache, or cross-process synchronization is implemented.
   - In multi-worker deployments (e.g. Uvicorn with multiple workers or multiple Render
     container replicas), each process maintains its own independent window. The effective
     cluster limit equals: configured_limit * number_of_active_workers.

2. Anti-IP-Spoofing Architecture:
   - Arbitrary client-supplied `X-Forwarded-For` headers are NEVER trusted blindly at index 0.
   - When `TRUSTED_PROXY_HOPS >= 1` (Render deployment has 1 reverse proxy):
     Extracts client IP from index `-TRUSTED_PROXY_HOPS` (the rightmost IP appended by
     the trusted reverse proxy), safely ignoring attacker-injected header prefixes.
   - When `TRUSTED_PROXY_HOPS == 0` (local dev / direct connection):
     Forwarding headers are disregarded entirely; direct socket peer IP (`request.client.host`) is used.

3. Authenticated User Identity Keying:
   - For authenticated endpoints, limits are keyed primarily by stable authenticated `user_id`,
     preventing users on shared NAT/campus networks from consuming each other's quota.
   - A secondary defensible IP-level abuse limit is enforced in tandem to mitigate socket flooding.
"""

from collections import deque
import logging
import threading
import time
from typing import Callable, Dict, Optional, Tuple, Union

from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)


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


class InMemoryRateLimiterStorage:
    """Thread-safe in-memory sliding window rate limiter storage."""

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


# Global singleton storage (process-local)
rate_limiter_storage = InMemoryRateLimiterStorage()


class RateLimiter:
    """
    FastAPI dependency callable that enforces sliding-window rate limits.
    Returns HTTP 429 Too Many Requests with standard Retry-After header upon violation.
    
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
