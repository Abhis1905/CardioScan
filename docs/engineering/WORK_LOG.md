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
