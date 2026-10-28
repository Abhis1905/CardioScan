# CardioScan Security Fix 02 — Session Revocation & Password Hardening

## 1. Executive Summary

- **Security Target:** Session security, JWT revocation, password policy hardening, and account lifecycle control.
- **Branch:** `security/fix-02-session-password-hardening`
- **Predecessor:** `security/fix-01-report-privacy` (commit `ffe3642`)
- **Key Vulnerabilities Remediated:**
  1. *Lack of Server-Side Session Invalidation:* Previously, logging out or resetting passwords only removed tokens on the client; issued JWTs remained valid until expiration.
  2. *Excessive Token Lifetime:* Access tokens had a 24-hour validity window.
  3. *Weak Password Constraints:* Registration and reset forms permitted passwords as short as 6 characters without blocklist or entropy checks.
  4. *Absence of Deactivation Gate:* Deactivated accounts could still make API requests if they held an unexpired JWT.

---

## 2. Architecture & Implementation Details

### A. Password Policy Hardening (`backend/app/core/password_policy.py`)
- **Length Bounds:** Strictly enforced minimum of 12 characters and maximum of 128 characters (mitigating Argon2id compute-exhaustion DoS).
- **Blocklist & Pattern Detection:**
  - Case-insensitive matching against common dictionary and breach passwords (`password`, `123456789012`, `cardioscan123`, `admin1234567`, etc.).
  - Character diversity check: rejects patterns with fewer than 3 unique characters (e.g. `aaaaaaaaaaaa`, `121212121212`).
  - Prefix pattern check: rejects trivial roots followed only by digits or punctuation (e.g. `password999999!`).
- **Passphrase Support:** Full support for multi-word phrases with spaces (e.g. `correct horse battery staple`).
- **Argon2id Integrity:** Preserved cryptographic parameters (`time_cost=2`, `memory_cost=19MiB`, `parallelism=1`, `hash_len=32`, `salt_len=16`).
- **Frontend Synchronization:** Updated `RegisterPage.jsx` and `ResetPasswordPage.jsx` indicators, toast checks, and button gates from 6 to 12 characters.

### B. Database-Backed Session Control (`backend/app/models/user.py` & Alembic `i5d6e7f8a9b0`)
- **Schema Additions on `users`:**
  - `token_version` (`INTEGER`, `NOT NULL`, server default `'1'`).
  - `is_active` (`BOOLEAN`, `NOT NULL`, server default `true`).
- **Alembic Migration:** `backend/alembic/versions/i5d6e7f8a9b0_add_token_version_and_active_flag.py` (down revision: `h4c5d6e7f8a9`).

### C. JWT Structure & Reduced TTL (`backend/app/core/security.py` & `config.py`)
- **Access Token TTL:** Reduced from 1,440 minutes (24h) to 120 minutes (2 hours). Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`.
- **JWT Claims Payload:**
  - `sub`: User ID (string).
  - `exp`: Expiration timestamp.
  - `iat`: Issuance timestamp.
  - `tv`: Integer `token_version` matching the database user's current version.
  - `jti`: Unique random 16-hex character token identifier (`secrets.token_hex(8)`).

### D. Authentication Dependency Enforcement (`backend/app/api/deps.py`)
- `get_current_user_optional` verifies:
  1. Token decodes successfully with HMAC-SHA256 (`JWT_SECRET`).
  2. Subject resolves to a valid database user.
  3. `user.is_active` is `True` (inactive accounts fail closed with 401).
  4. `payload.get("tv")` is present and strictly equals `user.token_version`. Outdated or missing `tv` claims fail closed with 401.

### E. Explicit Server-Side Logout (`POST /auth/logout`)
- Authenticated endpoint requiring `get_current_user`.
- Increments `current_user.token_version += 1` and commits to database.
- Immediately invalidates all tokens previously issued to that user across all devices/browsers.
- Frontend `logoutUser` in `AuthContext.js` calls `logout()` before purging `localStorage`.

### F. Password Reset Invalidation (`backend/app/services/tokens.py`)
- `consume_password_reset_token` increments `user.token_version += 1` in the same transaction as updating the password hash and clearing the reset token.
- Prevents stolen or leaked sessions from persisting after an account recovery.

### G. Segregation of Native JWT & Firebase Authentication
- Native Bearer routes only accept native HS256 JWTs with valid `tv` claims.
- Firebase RS256 ID tokens sent to Bearer endpoints fail signature validation and return 401.
- `POST /auth/firebase` explicitly checks `user.is_active` before issuing native session JWTs.

---

## 3. Verification & Automated Test Coverage

- **Total Backend Tests:** 159 passed (9 new tests, 0 regressions, 0 skipped).
- **Total Frontend Tests:** 9 passed (report integrity, rendering, sanitization).
- **Frontend Production Build:** Compiled successfully (`react-scripts build`).

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
