# CardioScan Security Fix 02 — Session Revocation & Password Hardening

## 1. Executive Summary

- **Security Target:** Session security, JWT revocation, password policy hardening, and account lifecycle control.
- **Active Branch:** `security/fix-02-hardening-remediation` (branched from `security/fix-02-session-password-hardening` at commit `d6ddaee`).
- **Predecessor:** `security/fix-01-report-privacy` (commit `ffe3642`).
- **Core Security Goals:**
  1. *Server-Side Session Invalidation:* Provide immediate server-side revocation on logout and password reset across all devices.
  2. *Token Lifetime & Entropy:* Reduce access token lifespan to 120 minutes with high-entropy JTI and versioning.
  3. *Password Hardening:* Enforce 12–128 character bounds, blocklists, and entropy checks while permitting natural passphrases with internal spaces.
  4. *Consistent Inactive Account Enforcement:* Block inactive accounts from authenticating, resetting credentials, or receiving emails across all auth flows.
  5. *Alembic Reliability:* Ensure migrations support offline `--sql` generation for PostgreSQL and SQLite.

---

## 2. Architecture & Implementation Details

### A. Password Policy Hardening (`backend/app/core/password_policy.py`)
- **Length Bounds (SEC-02-01 & SEC-02-09):**
  - Minimum of 12 characters is strictly evaluated against whitespace-stripped input (`len(password.strip()) >= 12`). Padded short inputs (e.g., `"      cat   "`, `"         abc"`) are rejected immediately.
  - Maximum of 128 characters is enforced (`len(password) <= 128`), mitigating Argon2id compute-exhaustion DoS.
- **Passphrase Preservation (SEC-02-01):**
  - Natural multi-word passphrases with internal spaces (e.g. `"correct horse battery staple"`) are preserved in full for Argon2id hashing and verification.
- **Blocklist & Pattern Detection:**
  - Case-insensitive matching against common dictionary and breach passwords (`password`, `123456789012`, `cardioscan123`, `admin1234567`, etc.).
  - Character diversity check: rejects patterns with fewer than 3 unique characters (e.g. `aaaaaaaaaaaa`, `121212121212`).
  - Prefix pattern check: rejects trivial roots followed only by digits or punctuation (e.g. `password999999!`).
- **Frontend Synchronization:** Updated `RegisterPage.jsx` and `ResetPasswordPage.jsx` indicators, toast checks, and button gates from 6 to 12 characters.

### B. Database-Backed Session Control (`backend/app/models/user.py` & Alembic `i5d6e7f8a9b0`)
- **Schema Additions on `users`:**
  - `token_version` (`INTEGER`, `NOT NULL`, server default `'1'`).
  - `is_active` (`BOOLEAN`, `NOT NULL`, server default `true`).
- **Alembic Migration (SEC-02-07):**
  - Updated `backend/alembic/versions/i5d6e7f8a9b0_add_token_version_and_active_flag.py` to use direct `op.add_column()` rather than batch mode.
  - Generates standard ANSI SQL (`ALTER TABLE users ADD COLUMN ...`) in offline `--sql` mode compatible with both SQLite and PostgreSQL without requiring live schema reflection.

### C. JWT Structure & Revocation Architecture (SEC-02-08)
- **Access Token TTL:** Reduced from 1,440 minutes (24h) to 120 minutes (2 hours). Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`.
- **JWT Claims Payload:**
  - `sub`: User ID (string).
  - `exp`: Expiration timestamp.
  - `iat`: Issuance timestamp.
  - `tv`: Integer `token_version` matching the database user's current version.
  - `jti`: Unique random 16-hex character token identifier (`secrets.token_hex(8)`).
- **Architecture Distinction (SEC-02-08):**
  - The `jti` claim provides cryptographic token entropy, uniqueness, and replay ambiguity prevention.
  - Session revocation is **version-based** via `token_version` comparison, not a distributed per-JTI denylist. When `token_version` is incremented in the database, all previously issued tokens (regardless of `jti`) are immediately rendered invalid without requiring centralized distributed storage for revoked tokens.

### D. Authentication Dependency Enforcement (SEC-02-05)
- `get_current_user_optional` in `backend/app/api/deps.py` enforces fail-closed semantics:
  1. Cryptographic HMAC-SHA256 signature verification (`JWT_SECRET`).
  2. Subject resolution to database user.
  3. `user.is_active` check: Inactive accounts fail closed with 401.
  4. Fail-closed `token_version` verification:
     ```python
     token_version = payload.get("tv")
     user_token_version = getattr(user, "token_version", None)
     if token_version is None or user_token_version is None or token_version != user_token_version:
         return None
     ```
     If `user.token_version` in the database is `NULL` or missing, or if the token has no `tv` claim, or if versions mismatch, the request fails closed immediately with 401 Unauthorized.

### E. Concurrency-Safe Logout & Rate Limiting (SEC-02-03 & SEC-02-04)
- **Rate Limiting:** `POST /auth/logout` is guarded by `rate_limit_logout` (20 requests per 60 seconds per user/IP) to mitigate denial-of-service or database write abuse.
- **Atomic Increment:** `logout` uses an atomic SQL expression `func.coalesce(User.token_version, 1) + 1` in the database engine, avoiding lost updates under concurrent logout requests.

### F. Client Logout & Failure Resilience (SEC-02-06)
- **Client Timeout:** `API.post("/auth/logout")` in `frontend/src/api.js` has a timeout of 3500ms.
- **Prompt Local Purge:** If the server is offline or times out, `AuthContext.js` logs a console warning, sets `session_notice=offline_logout` in `sessionStorage`, and promptly purges `localStorage.removeItem("token")`, `signOut(auth)`, and sets user state to null.
- **Residual Risk:** If server-side logout times out or network is severed, the previously copied JWT remains valid on the server until its 120-minute expiry or until the next password reset / successful logout.

### G. Inactive Account Enforcement Across Flows (SEC-02-02)
- `POST /auth/forgot-password`: Inactive accounts return a generic benign message (`"If this email is registered, a reset link has been sent."`) to prevent account enumeration, but do **not** generate a reset token and do **not** send an email.
- `POST /auth/reset-password`: Inactive accounts return HTTP 401 Unauthorized (`"Account is inactive"`), and no password hash or token version changes.
- `GET /auth/verify-email`: Inactive accounts return HTTP 401 Unauthorized and do not receive session tokens.
- `POST /auth/resend-verification`: Inactive accounts return a benign enumeration-safe response without dispatching emails.

---

## 3. Verification & Automated Test Coverage

- **Total Backend Tests:** 167 passed (17 new security tests, 0 regressions, 0 skipped).
- **Total Frontend Tests:** 9 passed (report integrity, rendering, sanitization).
- **Frontend Production Build:** Compiled successfully (`react-scripts build`).
- **Alembic Offline Mode:** Verified `alembic upgrade h4c5d6e7f8a9:i5d6e7f8a9b0 --sql` generates clean DDL without reflection errors.

### Newly Added Security Tests
1. `test_logout_revokes_jwt_server_side`: Confirms token is valid, `POST /auth/logout` succeeds, original token is immediately rejected on `/auth/me` (401), and subsequent login succeeds with updated `token_version`.
2. `test_password_reset_invalidates_all_active_sessions`: Confirms password reset revokes all existing JWTs and enforces new credentials.
3. `test_inactive_account_blocked`: Verifies that setting `is_active=False` blocks both active tokens and new login attempts.
4. `test_password_policy_enforcement_on_register`: Verifies rejection of passwords < 12 characters, common passwords, repetitive patterns, trivial prefixes, and acceptance of passphrases.
5. `test_password_policy_enforcement_on_reset`: Verifies password policy enforcement on `/auth/reset-password`.
6. `test_jwt_claims_structure_and_ttl`: Validates payload schema (`sub`, `tv`, `jti`, `exp`, `iat`) and 120-minute lifespan.
7. `test_jwt_missing_token_version_rejected`: Verifies tokens without `tv` are rejected.
8. `test_jwt_mismatched_token_version_rejected`: Verifies tokens with outdated `tv` are rejected.
9. `test_firebase_token_rejected_on_bearer_auth`: Verifies separation between Firebase tokens and native Bearer routes.
10. `test_password_policy_whitespace_padding_and_passphrase` (SEC-02-01): Verifies padded passwords rejected, passphrases preserved.
11. `test_password_length_boundary_128_and_129` (SEC-02-09): Verifies 128 characters accepted, 129 characters rejected.
12. `test_inactive_account_forgot_and_reset_flow` (SEC-02-02): Verifies inactive accounts cannot trigger reset emails or consume tokens.
13. `test_inactive_account_email_verification_flow` (SEC-02-02): Verifies inactive accounts cannot verify email or resend verification.
14. `test_logout_rate_limiting` (SEC-02-03): Verifies `POST /auth/logout` is rate-limited to 20 calls per 60s.
15. `test_jwt_fail_closed_on_null_user_token_version` (SEC-02-05): Verifies NULL `token_version` in DB or token fails closed.
16. `test_logout_atomic_increment` (SEC-02-04): Verifies atomic SQL token_version increment on logout.
17. `test_alembic_offline_sql_generation` (SEC-02-07): Verifies offline `--sql` migration generation succeeds.
