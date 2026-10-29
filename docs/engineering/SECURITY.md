# CardioScan Engineering Security Architecture & Threat Model

**Document Version:** 1.0.0
**Target Environment:** CardioScan v2.0 Production & Staging
**Classification:** Internal Engineering Architecture & Operational Guidance

---

## 1. Architectural Overview

CardioScan is a cardiovascular risk stratification and clinical decision-support application handling sensitive healthcare data, user credentials, prediction telemetry, and generated diagnostic reports.

Security defenses are implemented in depth across transport, persistence, application middleware, and client presentation layers.

```
       [ Client Browser / Mobile Web ]
                     │  (TLS 1.3 / HTTPS + HSTS)
                     ▼
             [ Reverse Proxy ]
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[ Security Headers ]     [ Turnstile Verification ]
(CSP, HSTS, Sniff-Guard) (Anti-Automation / Anti-Bot)
       │                           │
       └─────────────┬─────────────┘
                     ▼
           [ FastAPI Middleware ]
       (Sliding-Window Rate Limiting)
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[ Authentication ]       [ Role & Scope Checks ]
(Argon2id + HS256 JWT)   (Admin vs. Patient Isolation)
       │                           │
       └─────────────┬─────────────┘
                     ▼
          [ Minimized Data Layer ]
  (Pseudonymous Patient ID / Safe CSV Export)
                     │
                     ▼  (PostgreSQL + sslmode=verify-full)
          [ Hardened Persistence ]
```

---

## 2. Rate Limiting Architecture & Operational Caveats

CardioScan protects authentication and administrative endpoints against brute-force attacks, credential stuffing, enumeration, and denial-of-service through a sliding-window rate limiter implemented in `backend/app/core/rate_limit.py`.

### 2.1 Implementation Mechanics
- **Mechanism:** In-memory sliding-window log tracking client IP addresses.
- **Data Structure:** Process-local dictionary mapping client identifiers to timestamped request deques.
- **Granular Thresholds:**
  - Login / Authentication: Strict sliding window (e.g., 5 attempts per 60 seconds).
  - Password Reset / Verification: Strict sliding window (e.g., 3 requests per 60 seconds).
  - Logout: Dedicated threshold (10 requests per 60 seconds) with atomic database session invalidation.
  - CSV Data Exports: Throttled to prevent scraping or denial-of-service.

### 2.2 Architectural Limitations & Caveats

#### A. Process-Local Isolation
The sliding-window limiter operates entirely within the memory space of the active Python process. Counter state is **not shared** across:
- Multiple Uvicorn/Gunicorn worker processes (e.g., `WEB_CONCURRENCY > 1`).
- Multiple container instances in horizontal scaling (e.g., Kubernetes pods, Render multi-instance services).

**Impact:** When running across $N$ independent worker processes or containers without sticky sessions, an attacker's effective request budget is multiplied by $N$.

#### B. State Volatility
All rate-limiting counters are held in volatile RAM. A container restart, auto-scale event, or redeployment resets all sliding-window logs to zero.

#### C. Reverse Proxy Client IP Resolution
The rate limiter extracts client IP via `X-Forwarded-For` or `X-Real-IP`. Operational configurations behind reverse proxies (Cloudflare, AWS ALB, Render) must ensure proxy headers are validated so untrusted clients cannot spoof arbitrary IP addresses to circumvent limits.

### 2.3 Operational Assumptions for Current Deployment
1. **Single-Worker Topology:** Production deployment currently runs in a single-instance container profile (`workers=1` on Uvicorn).
2. **Reverse Proxy Upstream:** Cloudflare / edge proxy enforces initial DDoS mitigation and bot management (Cloudflare Turnstile) before traffic reaches the application layer.

### 2.4 Roadmap for Horizontal Scaling (Distributed Redis Limiter)
When scaling horizontally beyond a single process, the in-memory limiter must be replaced with a distributed sliding-window or token-bucket implementation backed by Redis:

1. **Storage:** Centralized Redis instance (e.g., Redis Cluster or managed AWS ElastiCache / Redis Cloud).
2. **Algorithm:** Redis Sorted Sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`, `EXPIRE`) executing atomically via Lua scripts to eliminate race conditions between workers.
3. **Graceful Fallback:** If Redis is temporarily unreachable, fall back to process-local in-memory limiting with alerting rather than allowing unthrottled traffic.

---

## 3. Session Lifecycle & Token Revocation Architecture

CardioScan issues native JSON Web Tokens (HS256) upon successful authentication. To resolve the traditional limitation of stateless JWTs where issued tokens remain valid until expiration, CardioScan implements atomic server-side session invalidation:

### 3.1 Token Versioning & Atomic Invalidation
- Each user account maintains an integer `token_version` column in the database (defaulting to `1`).
- The user's active `token_version` is embedded as a claim within every issued JWT (`{"sub": user.id, "token_version": 1, ...}`).
- The `get_current_user` dependency compares the token's embedded version against the live database record on every authenticated request.
- If the token's version does not match the database version, the request is immediately rejected with HTTP 401 Unauthorized.

### 3.2 Invalidation Triggers
- **User Logout:** `POST /auth/logout` atomically increments `token_version` using SQL `coalesce(token_version, 1) + 1`, immediately invalidating all outstanding JWTs across all devices.
- **Password Change:** `POST /auth/change-password` atomically increments `token_version` upon successful credential update.
- **Password Reset:** `POST /auth/reset-password` atomically increments `token_version` and invalidates any outstanding reset tokens.
- **Account Deactivation:** Inactive accounts (`is_active == False`) are immediately denied access across all protected endpoints regardless of token validity.

---

## 4. Sensitive Health Data Minimization & Privacy

CardioScan strictly applies the principle of data minimization (GDPR Art. 5(1)(c), HIPAA Security Rule) across public endpoints, administrative consoles, and exported files:

### 4.1 Pseudonymous Patient Identification
- Patient health records and prediction histories are decoupled from real names and emails using a pseudonymous, non-sequential Patient ID (e.g., `PID-XXXXXXXX`).
- Historical PDF reports and prediction history lookups prioritize recorded snapshot data to ensure immutability and prevent retroactive data tampering.

### 4.2 Administrative Console Minimization
- The `GET /admin/predictions` endpoint omits patient legal names, personal email addresses, free-text clinical notes, raw physiological biomarkers, and SHAP attribution arrays.
- Telemetry returned to administrators is restricted strictly to operational identifiers (`id`, `report_id`, `patient_id`, `user_id`), model metadata (`model_used`), and classification outcomes (`prediction`, `probability`, `risk_level`, `created_at`).

### 4.3 Safe CSV Export Architecture
- **UTF-8 BOM:** Administrative CSV exports (`/admin/export/users`, `/admin/export/predictions`) prepend `\ufeff` (UTF-8 Byte Order Mark) with `media_type="text/csv; charset=utf-8"` to prevent character corruption across Microsoft Excel, Apple Numbers, and Google Sheets.
- **Formula Injection Mitigation (CSV Injection / DDE):** Cells beginning with dangerous spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`), even when preceded by leading whitespace, are escaped with a leading single quote (`'`).
- **Negative Number Preservation:** Legitimate signed numeric values (e.g., negative integers or floating-point coordinates) are detected and preserved without breaking numerical formatting.

---

## 5. Transport & Persistence Security (TLS Enforcement)

### 5.1 Mandatory Production Database TLS
- In `ENVIRONMENT=production`, the application strictly mandates PostgreSQL connection strings specifying `sslmode=verify-full`.
- Connection configurations specifying missing `sslmode` or insecure modes (`disable`, `allow`, `prefer`, `require`, `verify-ca`) are actively rejected during startup with descriptive configuration errors.
- URL normalization automatically translates legacy schemes (`postgres://` and `postgresql://`) to `postgresql+psycopg2://` while preserving URL-encoded credentials and Neon-specific query parameters.

### 5.2 Migration Pipeline Safety
- Alembic database migration scripts (`backend/alembic/env.py`) enforce the same production safety validation in both online and offline migration generation modes (`run_migrations_online()` and `run_migrations_offline()`), preventing accidental migration runs against unverified database connections.

### 5.3 HTTP Security Headers
All HTTP responses in production include:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'; ...`
- Interactive Swagger UI (`/docs`) and ReDoc (`/redoc`) documentation endpoints are strictly disabled in production environments.
