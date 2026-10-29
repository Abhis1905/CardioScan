# CardioScan Engineering Work Log

## Security Fix 02 — Session Revocation & Password Hardening (Remediation Phase)
**Date:** October 28, 2026
**Active Branch:** `security/fix-02-hardening-remediation`
**Base Branch:** `security/fix-02-session-password-hardening` (commit `d6ddaee`)
**Scope:** Remediated all 9 findings from the adversarial security audit of Fix 02 across backend, frontend, migrations, and test suites.

### Summary of Remediations

1. **SEC-02-01 (Whitespace-Padded Passwords & Passphrase Preservation):**
   - In `backend/app/core/password_policy.py`, evaluates `len(password.strip()) >= 12` so inputs like `"      cat   "` and `"         abc"` are rejected immediately.
   - Raw `password` is preserved for Argon2id hashing in `auth.py`, preserving natural internal spaces in passphrases (`"correct horse battery staple"`).

2. **SEC-02-02 (Inactive Account Enforcement Across Auth Flows):**
   - In `backend/app/api/auth.py` and `backend/app/services/tokens.py`:
     - `POST /auth/forgot-password`: Inactive accounts return generic benign message without generating reset tokens or dispatching emails.
     - `POST /auth/reset-password`: Inactive accounts fail closed with HTTP 401 Unauthorized (`"Account is inactive"`).
     - `GET /auth/verify-email`: Inactive accounts fail closed with HTTP 401 Unauthorized without session issuance.
     - `POST /auth/resend-verification`: Inactive accounts return benign enumeration-safe response without dispatching emails.

3. **SEC-02-03 (Rate Limiting on Logout):**
   - Configured `RATE_LIMIT_LOGOUT = 20` and `RATE_LIMIT_LOGOUT_WINDOW = 60` in `config.py` and `rate_limiter.py`.
   - Added `dependencies=[Depends(rate_limit_logout)]` to `POST /auth/logout`.

4. **SEC-02-04 (Atomic SQL Token Version Increments):**
   - Converted `logout` and `consume_password_reset_token` to use `func.coalesce(User.token_version, 1) + 1` via SQLAlchemy atomic update queries to eliminate concurrency race conditions.

5. **SEC-02-05 (Fail-Closed Handling of NULL Token Versions):**
   - In `backend/app/api/deps.py`, updated `user_token_version = getattr(user, "token_version", None)`. If `token_version is None`, `user_token_version is None`, or versions mismatch, authentication fails closed immediately.

6. **SEC-02-06 (Frontend Logout Timeout & Failure Resilience):**
   - Configured `timeout: 3500` in `frontend/src/api.js` for `logout()`.
   - In `frontend/src/context/AuthContext.js`, `logoutUser` catches server timeouts/errors, logs a console warning, sets `sessionStorage.setItem("session_notice", "offline_logout")`, and immediately purges local tokens and state.

7. **SEC-02-07 (Alembic Offline `--sql` Support):**
   - Updated `backend/alembic/versions/i5d6e7f8a9b0_add_token_version_and_active_flag.py` to use direct `op.add_column()` instead of batch mode for upgrade, enabling clean offline SQL generation for PostgreSQL and SQLite.

8. **SEC-02-08 (Accurate JTI vs Version Revocation Documentation):**
   - Documented that `jti` provides cryptographic token entropy/anti-collision uniqueness, while session revocation is version-based via `token_version` (not a distributed per-JTI denylist).

9. **SEC-02-09 (128/129-Character Password Boundary Tests):**
   - Added tests verifying 128 characters is accepted and 129 characters is rejected on registration and password reset.

### Test Verification

- **Backend:** 167 tests passed (0 failures, 0 skipped).
- **Frontend:** 9 tests passed.
- **Frontend Build:** Successfully created production build (`npm run build`).
- **Alembic:** Offline `--sql` generation and full migration upgrade/downgrade verified.

## Priority 1 Production Security & Privacy Hardening
**Date:** October 28, 2026
**Active Branch:** `security/priority-1-production-hardening`
**Base Commit:** `59feee2` (`security/fix-02-hardening-remediation`)
**Scope:** Implemented and tested all five Priority 1 production hardening packages across database configuration, HTTP response headers, API documentation, administrative data exports, and authenticated credential management.

### Summary of Implementation

1. **WP1: Production Database TLS Enforcement (`backend/app/core/config.py`)**
   - Hardened `validate_production_safety()` to parse `DATABASE_URL` using SQLAlchemy 2.0 `make_url()`.
   - Requires PostgreSQL in production (`postgresql` / `postgresql+*`); rejects SQLite and unsupported database dialects.
   - Requires explicit secure SSL modes: `require`, `verify-ca`, or `verify-full`.
   - Rejects insecure SSL modes (`disable`, `allow`, `prefer`) and missing `sslmode` parameters.
   - Fully compatible with Neon pooled connections and query parameters (e.g., `sslmode=require&channel_binding=require`).
   - Exception handling masks and sanitizes database connection strings to prevent credential leakage in logs or error traces.
   - Preserves SQLite for local development and test environments (`is_production is False`).

2. **WP2: HTTP Security Headers Middleware (`backend/app/main.py`)**
   - Implemented `SecurityHeadersMiddleware(BaseHTTPMiddleware)` attached across all normal, preflight (OPTIONS), and error responses:
     - `X-Content-Type-Options: nosniff` (MIME-sniffing prevention)
     - `X-Frame-Options: DENY` (clickjacking protection)
     - `Referrer-Policy: strict-origin-when-cross-origin` (referrer privacy)
     - `Content-Security-Policy`: Scoped to `default-src 'none'; frame-ancestors 'none'` in production; configured with trusted CDN allowances for Swagger/ReDoc in development.
     - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS): Attached strictly in production when requests are served over HTTPS or behind trusted reverse proxies (`x-forwarded-proto == "https"`). Omitted on plain HTTP and local development.

3. **WP3: Disabled Interactive Documentation in Production (`backend/app/main.py`)**
   - Configured `docs_url`, `redoc_url`, and `openapi_url` to evaluate to `None` when `settings.is_production is True`.
   - Wrapped FastAPI instantiation in a reusable `create_app()` factory function to support clean testing and environment-driven configuration.
   - Verified that `/docs`, `/redoc`, and `/openapi.json` return HTTP 404 in production, while remaining accessible in development and test environments.

4. **WP4: Administrative Prediction CSV Export Privacy & Formula Injection Defense (`backend/app/api/admin.py`)**
   - Applied data minimization to `admin_export_predictions`: omitted patient full names, personal email addresses, and all 13 raw clinical biomarkers (`age`, `sex`, `cp`, `trestbps`, `chol`, `fbs`, `restecg`, `thalach`, `exang`, `oldpeak`, `slope`, `ca`, `thal`).
   - Minimized export schema now exposes only pseudonymous operational fields: `Prediction ID`, `Report ID`, `Patient ID`, `Model Used`, `Prediction`, `Probability`, `Risk Level`, `Created At`.
   - Implemented `_sanitize_csv_cell()` neutralizing spreadsheet formula injection (CSV injection / CWE-1236) by prefixing cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote (`'`). Applied defense-in-depth across both prediction and user CSV exports.
   - Enforced administrative access controls (HTTP 401 for unauthenticated, HTTP 403 for standard patients).

5. **WP5: Authenticated Password Change & Immediate Session Invalidation (`backend/app/api/auth.py`, `backend/app/schemas/auth.py`, `frontend/src/api.js`)**
   - Implemented `POST /auth/change-password` requiring an active, authenticated native session (`get_current_user`).
   - Rate-limited with dedicated limiter `rate_limit_change_password` (5 requests per 60 seconds per IP/user identity).
   - Verifies the current password using Argon2id (`verify_password`).
   - Rejects identical old and new passwords.
   - Enforces the centralized password complexity and length policy (`validate_password_strength`).
   - Computes new password hash using Argon2id.
   - Atomically updates password hash and increments `token_version` via SQL (`func.coalesce(User.token_version, 1) + 1`), immediately invalidating all pre-existing JWT access tokens across all devices.
   - Inactive accounts fail closed with HTTP 401. Federated-only accounts (Google/Firebase without native password hash) are cleanly rejected with HTTP 400 and code `federated_account_no_password`.
   - Exported client method `changePassword` in `frontend/src/api.js`.

### Test Verification

- **Backend Pytest Suite:** 193 passed (0 failed, 0 skipped; 26 new automated regression tests added).
  - Database TLS validation, dialect verification, and credential sanitization: 7 tests.
  - Production interactive docs disabling & development enablement: 2 tests.
  - HTTP security headers, CORS preflight, and conditional HSTS: 3 tests.
  - Administrative prediction export data minimization, formula injection defense, empty export, and authorization: 6 tests.
  - Authenticated password change, atomic token revocation, identical password rejection, weak password rejection, inactive account defense, federated account defense, and rate limiting: 8 tests.
- **Frontend Jest Suite:** 9 passed (0 failed).
- **Frontend Production Build:** Compiled successfully via `npm run build`.
- **Git Formatting:** `git diff --check` passed cleanly with 0 whitespace errors.

## Priority 1.1 Production Security Remediation
**Date:** October 29, 2026
**Active Branch:** `security/priority-1-remediation`
**Base Commit:** `fe4f34e` (`security/priority-1-production-hardening`)
**Scope:** Implemented and tested all eight Priority 1.1 remediation items addressing findings from the independent adversarial audit across database TLS policy, password change frontend interface, administrative data minimization, CSV formula injection defense, Alembic migration safety, URL normalization, CSV character encoding, and rate limiter documentation.

### Summary of Implementation

1. **Item A: Mandatory Database TLS Full Verification (`backend/app/core/config.py`)**
   - Mandated `sslmode=verify-full` in production environments (`ENVIRONMENT=production`).
   - Actively rejects insecure modes (`disable`, `allow`, `prefer`) as well as insufficient modes (`require`, `verify-ca`) that skip certificate hostname validation.
   - Evaluates all query parameters when multiple `sslmode` declarations occur to prevent bypasses.

2. **Item B: Password Change Frontend Interface (`frontend/src/pages/ProfilePage.jsx`)**
   - Built accessible, responsive credential management card in `ProfilePage.jsx` titled "Account Security & Credentials".
   - Form fields: Current Password, New Password, Confirm New Password with show/hide password toggles.
   - Client validation: Minimum 12 characters, confirmation matching, non-empty validation, and difference from current password.
   - Clean backend error mapping and toast notification without sensitive data exposure.
   - Federated account handling: Detects accounts without native passwords (`user?.has_password === false`) and renders informative message explaining credentials must be managed via their SSO provider.
   - Session termination: On successful update, clears tokens from `localStorage`, signs out Firebase identity, resets auth state, and redirects to `/login`.

3. **Item C: Administrative Prediction Endpoint Data Minimization (`backend/app/api/admin.py`, `frontend/src/pages/AdminPage.jsx`)**
   - Minimized `GET /admin/predictions` payload to return only pseudonymous operational fields (`id`, `report_id`, `patient_id`, `user_id`, `model_used`, `prediction`, `probability`, `risk_level`, `created_at`).
   - Strictly omitted patient legal names, personal email addresses, raw clinical biomarkers, physician notes, and SHAP attribution vectors.
   - Updated `AdminPage.jsx` table view and search filter to operate on `patient_id` and `report_id` instead of patient names or emails.

4. **Item D: CSV Formula Injection Defense Hardening (`backend/app/api/admin.py`)**
   - Hardened `_sanitize_csv_cell()` to strip leading whitespace before checking for formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`).
   - Sanitizes control character prefixes such as tabs or carriage returns.
   - Preserves legitimate negative numeric values (integers, floating point numbers, and formatted decimals) without breaking calculations or prepending escape characters.

5. **Item E: Alembic Production Safety Validation (`backend/alembic/env.py`)**
   - Integrated `settings.validate_production_safety()` in both `run_migrations_offline()` and `run_migrations_online()` when `settings.is_production is True`.
   - Ensures migrations cannot execute or generate static SQL against unverified, insecure, or SQLite databases in production mode.

6. **Item F: Robust PostgreSQL URL Normalization (`backend/app/core/config.py`)**
   - Standardized `sync_database_url` to normalize both legacy `postgres://` and `postgresql://` schemes into `postgresql+psycopg2://`.
   - Correctly preserves URL-encoded credentials (usernames/passwords with special characters) and query parameters (such as Neon pooler settings and `channel_binding`).

7. **Item G: CSV Character Encoding & UTF-8 BOM Compatibility (`backend/app/api/admin.py`)**
   - Prepended UTF-8 Byte Order Mark (`\ufeff`) to exported CSV streams in `/admin/export/users` and `/admin/export/predictions`.
   - Set explicit content type header: `media_type="text/csv; charset=utf-8"`, ensuring seamless rendering in Microsoft Excel, Apple Numbers, and LibreOffice.

8. **Item H: Rate Limiting Architecture & Limitations Documentation (`docs/engineering/SECURITY.md`)**
   - Authored comprehensive architectural document detailing the sliding-window rate limiting system.
   - Documented process-local in-memory scope, horizontal scaling implications, process restart volatility, and migration path to a distributed Redis backend.

### Test Verification

- **Backend Pytest Suite:** 196 passed (0 failed, 0 skipped; 3 new regression tests added).
  - Database TLS `verify-full` mandate, URL normalization, and Alembic safety: 4 tests.
  - Minimized prediction endpoint and safe CSV exports: 2 tests.
  - Formula injection edge cases and negative number preservation: 1 test.
- **Frontend Jest Suite:** 9 passed (0 failed).
- **Frontend Production Build:** Compiled successfully via `npm run build`.
- **Alembic Static Migration Verification:** Verified clean offline `--sql` migration traversal across all revisions up to `i5d6e7f8a9b0`.
- **Git Formatting:** `git diff --check` passed cleanly with 0 whitespace errors.
