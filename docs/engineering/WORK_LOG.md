# CardioScan Engineering Work Log

## Security Fix 02 — Session Revocation & Password Hardening
**Date:** October 28, 2026  
**Branch:** `security/fix-02-session-password-hardening`  
**Base Commit:** `ffe3642` (`security/fix-01-report-privacy`)  
**Scope:** Backend & Frontend Session Security, Password Policy, Token Revocation, Inactive Account Handling

### Summary of Changes

1. **Password Policy Engine (`backend/app/core/password_policy.py`):**
   - Implemented `validate_password_strength()` enforcing 12–128 character limits.
   - Case-insensitive blocklist check against common dictionary and breach passwords.
   - Low diversity and trivial root checks.
   - Support for multi-word passphrases with whitespace.
   - Integrated with `POST /auth/register` and `POST /auth/reset-password`.

2. **Database Schema & Session Migration (`backend/alembic/versions/i5d6e7f8a9b0_...`):**
   - Added `token_version` (Integer, default 1, nullable=False) to `users`.
   - Added `is_active` (Boolean, default True, nullable=False) to `users`.
   - Created migration `i5d6e7f8a9b0_add_token_version_and_active_flag.py` descending from `h4c5d6e7f8a9`.

3. **Token Lifecycle & Security Configuration (`backend/app/core/config.py`, `security.py`):**
   - Reduced `ACCESS_TOKEN_EXPIRE_MINUTES` to 120 (2 hours).
   - Added `tv` (token_version) and `jti` (unique token ID) claims to `create_access_token()`.

4. **Dependency & Invalidation Logic (`backend/app/api/deps.py`, `auth.py`, `tokens.py`):**
   - Hardened `get_current_user_optional` to verify `is_active` and strict match on `token_version`.
   - Added `POST /auth/logout` to increment `current_user.token_version` on demand.
   - Updated `consume_password_reset_token` to increment `token_version` on password reset.
   - Updated all token issuance calls (`login`, `verify_email`, `google`, `firebase`) to include current `token_version`.
   - Enforced `is_active` checks in `login`, `google_auth`, and `firebase_auth`.

5. **Frontend Client Alignment (`frontend/src/...`):**
   - Exported `logout` in `api.js`.
   - Updated `logoutUser` in `AuthContext.js` to call server-side logout before clearing local state.
   - Updated `RegisterPage.jsx` and `ResetPasswordPage.jsx` password length validations, requirements text, and button state conditions from 6 to 12 characters.

6. **Test Verification:**
   - 159 backend tests passing (including 9 new targeted security tests).
   - 9 frontend report tests passing.
   - Clean production build (`npm run build`).
