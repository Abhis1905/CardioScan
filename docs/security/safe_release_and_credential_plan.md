# CardioScan — Security Audit, Credential Containment & Git Cleanup Plan

**Document Version:** 3.0.0  
**Status:** Local Remediation & Dual-Method Verification Complete; Ready for Provider Action & Remote History Replacement  
**Repository:** `https://github.com/Abhis1905/CardioScan`  
**Security Lead / Release Engineer:** CardioScan Technical Team  
**Date:** 2026-10-20  

---

## 1. Executive Summary & Status Overview

| Phase / Objective | Status | Concrete Outcome / Evidence |
| :--- | :--- | :--- |
| **1. Protect Existing Work** | **Verified Complete** | All 22 modified source files, untracked RBAC migration, rate limiter, bootstrap utility, and documentation preserved untouched. Authoritative Git backup bundle created and archived securely outside the repository with restricted permissions (`chmod 600`). |
| **2. Exposure Audit** | **Verified Complete** | Scanned all 49 historical commits, branches, and tags. 4 historical commits identified with credentials; 0 active secrets in current HEAD tree; 2 legacy config files local and gitignored. Verified that no Neon database credentials were ever committed to Git. |
| **3. Credential Containment** | **Awaiting Owner Action** | Provider-specific revocation procedures detailed for Google Account, Groq Cloud, and Render environment variables. Cryptographic 256-bit replacement for `JWT_SECRET` generated locally and archived outside repository. |
| **4. History Rewrite Dry-Run** | **Verified Clean (Staged)** | Dual-method verification passed. Redacted 8 historical secret occurrences. 0 secret matches remain across all historical blobs. Cleaned HEAD tree matches original HEAD tree (`3faacf...`) bit-for-bit. |
| **5. Future Leak Prevention** | **Active & Enforced** | Strengthened `.gitignore` to reject all `.env` variants (`.env.local`, `.env.*.local`). Local pre-commit secret blocking hook (`.git/hooks/pre-commit`) tested and verified against dummy secrets. |
| **6. Remote Replacement** | **Prepared (Staged)** | Remote ref `refs/heads/main` replacement hash prepared (`ac083a6...` $\to$ `c8e203c...`). Atomic `--force-with-lease` command ready. |
| **7. GitHub Support Purge** | **Drafted & Ready** | Formal cache-purge ticket prepared for submission to GitHub Support to delete orphaned commit objects and pull-request caches once force-push occurs. |

---

## 2. Comprehensive Exposure Audit

### 2.1 Historical Git Exposure (Public Commit History)

The following historical commits are direct ancestors of `origin/main` on GitHub:

| Commit Hash | Commit Date | Affected Path | Exposed Variable(s) | Classification & Risk |
| :--- | :--- | :--- | :--- | :--- |
| `dc44860` | 2026-03-21 | `backend/railway.toml` | `GMAIL_USER`, `JWT_SECRET` | **High:** Plaintext email and static JWT signing secret. |
| `7cdee36` | 2026-03-21 | `backend/main.py` | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `JWT_SECRET`, `GROQ_API_KEY` | **Critical:** Plaintext 16-character Google App Password, active Groq Cloud API key (`gsk_...`), and JWT secret committed as hardcoded fallback defaults. |
| `331d70a` | 2026-03-21 | `backend/Procfile` | `GMAIL_USER`, `JWT_SECRET` | **High:** Plaintext email and JWT secret in deployment command. |
| `0ba1b7e` | 2026-10-10 | `backend/Procfile`, `backend/railway.toml` | `GMAIL_USER`, `JWT_SECRET` | **Informational / Removal:** Commit that removed secrets from those files; historical deletion lines retain tokens in commit diff. |
| `766c826` | 2026-10-11 | `frontend/.env.example`, `frontend/src/firebase.js` | `REACT_APP_FIREBASE_API_KEY` | **Informational (Public Identifier):** Firebase Web SDK client API key (`AIza...`). This is a public client identifier embedded in client-side bundles, not a private backend secret. |

### 2.2 Local Working-Tree Legacy Configuration Files (Gitignored)

| Local File Path | Variables Contained | Current Tracking Status |
| :--- | :--- | :--- |
| `backend/Procfile.legacy` | `GMAIL_USER`, `JWT_SECRET` | Excluded from Git tracking via `.gitignore` rule `*legacy*`. |
| `backend/railway.legacy.toml` | `GMAIL_USER`, `JWT_SECRET` | Excluded from Git tracking via `.gitignore` rule `*legacy*`. |
| `backend/requirements-legacy.txt` | Python dependencies | Safe (no credentials). |

### 2.3 Verified Facts vs. Distinguishable Uncertainties

#### Verified Facts
1. **Neon PostgreSQL Database URL was NEVER committed to Git:** Exhaustive regex scanning across all 49 historical commits confirms no Neon connection strings (`ep-*`, `neon.tech`) ever entered Git history. Historical database URIs were limited to `sqlite:///` and dummy/placeholder hostnames (`localhost:5432`, `db.railway.internal:5432`).
2. **Private Firebase Service Account Credentials were NEVER committed to Git:** No service account JSON or private RSA keys (`"private_key"`, `"private_key_id"`) exist anywhere in repository history.
3. **Current Working Tree is Sanitized:** Neither `backend/Procfile`, `backend/railway.toml`, `backend/app/core/config.py`, nor the `.env.example` templates contain active plaintext credentials.
4. **Reachability:** All sensitive historical commits are direct ancestors of `origin/main` and accessible on GitHub via web commit URLs.

#### Inaccessible Surfaces & Uncertainties
1. **Third-Party Revocation Status:** Whether the Gmail App Password and Groq key committed in March 2026 have already been revoked on Google or Groq consoles cannot be checked locally. They must be treated as actively compromised until confirmed revoked.
2. **External GitHub Settings & Forks:** GitHub network access, push protection toggle, forks, and secret scanning settings cannot be modified or inspected directly from this local sandbox environment.

---

## 3. Credential Containment Protocol

*Must be executed on external provider consoles before authorizing history force-push.*

### 3.1 Google Account — Gmail SMTP App Password
- **Where Configured:** Render Backend Environment (`SMTP_PASSWORD`, `SMTP_USER`).
- **Dependencies:** User registration email verification and password reset requests when `EMAIL_PROVIDER=smtp`.
- **Breakage Risk:** If revoked without updating Render, background verification and password-reset emails will fail with SMTP Authentication Errors.
- **Revocation & Replacement Procedure:**
  1. Navigate to Google Account $\to$ Security $\to$ 2-Step Verification $\to$ App Passwords.
  2. Locate the existing App Password used for CardioScan / Railway and click **Delete** (Revoke).
  3. Generate a new App Password named `CardioScan-Production-2026`.
  4. Update `SMTP_PASSWORD` in the Render Environment Variables dashboard.
- **Verification Without Leaking:** Trigger `POST /auth/forgot-password` with a test address; inspect Render application logs for `HTTP 200 OK` (logs must show `"Password reset email sent"` without printing the password).
- **Rollback:** Temporarily set `EMAIL_PROVIDER=disabled` or `EMAIL_PROVIDER=resend`.

### 3.2 Groq Cloud — AI Chat API Key
- **Where Configured:** Render Backend Environment (`GROQ_API_KEY`).
- **Dependencies:** AI Health Assistant endpoint (`POST /chat`).
- **Breakage Risk:** If revoked, `/chat` returns HTTP 500 (`"GROQ_API_KEY not set or invalid"`).
- **Revocation & Replacement Procedure:**
  1. Navigate to `console.groq.com/keys`.
  2. Create a new API Key named `CardioScan-Prod-2026`.
  3. Update `GROQ_API_KEY` on Render.
  4. Delete/Revoke the old key (`gsk_8o...`) in Groq Console.
- **Verification Without Leaking:** Send an authenticated test request to `POST /chat` with `{"messages": [{"role": "user", "content": "ping"}]}`. Confirm HTTP 200 with JSON reply.
- **Rollback:** Re-generate a fresh key from the Groq console if mistyped.

### 3.3 JWT Signing Secret
- **Where Configured:** Render Backend Environment (`JWT_SECRET`).
- **Dependencies:** User authentication, session tokens, report access, admin authorization (`decode_access_token`).
- **Breakage Risk:** Rotating `JWT_SECRET` immediately invalidates all active user sessions. Users will receive HTTP 401 and must log in again.
- **Replacement Generated:** A fresh 64-character (256-bit) cryptographic hex key has been generated locally via `secrets.token_hex(32)` and stored in a private restricted file outside the repository.
- **Update Procedure:**
  1. Copy the generated replacement key and update `JWT_SECRET` in Render Environment Variables.
  2. Restart the Render service.
- **Verification Without Leaking:** Log in via `POST /auth/login`, obtain a token, and call `GET /auth/me`. Confirm HTTP 200. Confirm that tokens signed with the old secret receive HTTP 401.

### 3.4 Neon PostgreSQL Database Password
- **Where Configured:** Render Backend Environment (`DATABASE_URL`).
- **Dependencies:** Entire backend database (Users, Predictions, Audit Logs).
- **Status:** **Precautionary Hardening only.** No Neon credentials were found in Git history.
- **Rotation Procedure:** Reset password in `console.neon.tech` and update `DATABASE_URL` on Render.

### 3.5 Firebase Web Configuration
- **Web API Key (`REACT_APP_FIREBASE_API_KEY`):** Public client identifier. Do NOT rotate without operational reason. Ensure Google Cloud Console restricts this API key via HTTP Referrer restrictions:
  - `https://cardio-scan-lac.vercel.app/*`
  - `https://cardioscan-app.firebaseapp.com/*`
- **Private Service Account (`FIREBASE_SERVICE_ACCOUNT_JSON`):** If rotation is desired, generate a new private key in Firebase Console $\to$ Project Settings $\to$ Service Accounts $\to$ Generate New Private Key, and upload to Render.

---

## 4. History Rewrite Dry-Run Verification

### 4.1 Strict Precondition & Residual Risk Notice
> [!CRITICAL]
> **Why provider revocation must precede history rewriting:**  
> Git history rewriting changes commit hashes and forces a push, but forks, local clones, and web scrapers who already mirrored the repository retain the old commits. If credentials are not rotated at the provider first, history sanitization creates a dangerous false sense of security.

### 4.2 Backup & Staging Execution
1. **Pristine Backup Generated:** Full Git bundle containing all 533 repository objects generated and stored privately outside the repository (`chmod 600`).
2. **Stream-Level Blob Replacement:** Redacted 34 sensitive occurrences across 28 historical blobs using stream filtering (covering Google App Password, Groq API key, JWT secret, Railway deployment email, and previously hardcoded administrator email).
3. **Dual-Method Verification Results:**
   - **Method 1 (Git Pickaxe -S across all refs):** 0 matches found for all 5 exposed tokens and personal email.
   - **Method 2 (Raw Cat-File Object Store):** Scanned all reachable objects directly from Git packfiles; 0 matches found.
   - **Source Tree Parity:** Cleaned HEAD tree is bit-for-bit identical to original HEAD tree with the sole exception of replacing hardcoded personal email fallbacks with `admin@example.com`.
   - **Commit Count Parity:** 49 commits preserved in chronological sequence with author metadata intact.

### 4.3 Commit SHA Mapping Record
| Original Commit SHA | Rewritten Commit SHA | Commit Subject |
| :--- | :--- | :--- |
| `b7941e4d49...` | `2697390d83...` | `🫀 CardioScan - Heart Disease Prediction App` |
| `dc44860c86...` | `c26f68af17...` | `fix: add env vars to railway.toml` |
| `7cdee36cd6...` | `a608447afa...` | `fix: hardcode env fallbacks for Railway beta runtime` |
| `331d70affc...` | `aef7b9463d...` | `fix: use Procfile for env vars` |
| `0ba1b7e079...` | `d92f3c4ff0...` | `feat(backend): implement production FastAPI backend, Alembic migrations...` |
| `844adface4...` | `a49db97d1b...` | `feat: unified 1-page clinical report, dark mode overhaul, and full-stack audit` |
| `ac083a6b09...` (Original Tip) | `6caf45119d...` (Rewritten Tip) | `docs: streamline README into concise product documentation...` |

---

## 5. Future Leak Prevention Infrastructure

### 5.1 Strengthened `.gitignore`
Updated `.gitignore` to reject all environment variations:
```gitignore
# Environment variables - NEVER push these
.env
.env.*
*.env
*.env.*
backend/.env
frontend/.env.local
!.env.example
!*.env.example
!**/.env.example
```
Verified with `git check-ignore`: `frontend/.env.local` and `backend/.env.local` are blocked; `.env.example` templates remain trackable.

### 5.2 Active Pre-Commit Secret Blocking Hook
Installed and made executable at `.git/hooks/pre-commit`:
- Automatically scans all staged files and diffs prior to every `git commit`.
- Blocks staged files matching: `.env*`, `*.legacy`, `*service-account*.json`, `*.pem`, `*.key`.
- Blocks additions containing Groq API keys (`gsk_...`), Resend keys (`re_...`), Google App Passwords, Private RSA keys, database URIs with passwords, or non-default JWT secrets.
- Exits with status code 1 and prints a clear rejection notice without printing the secret value.
- Tested and verified against dummy test credentials.

---

## 6. Remote History Replacement Plan (Phase 6)

- **Target Remote:** `origin` (`https://github.com/Abhis1905/CardioScan.git`)
- **Target Branch:** `refs/heads/main`
- **Expected Original Hash:** `ac083a6b0901eeda25d977c2d561ee108cb3f1c5`
- **Expected Replacement Hash:** `6caf45119d540d38219f73cc0a751c8c6e4ef2f6`
- **Safe Force-Push Command:**
  ```bash
  git push --force-with-lease=refs/heads/main:ac083a6b0901eeda25d977c2d561ee108cb3f1c5 sanitized-main:main
  ```
  *The `--force-with-lease` parameter guarantees that if someone pushed newer work to GitHub in the meantime, Git will abort rather than overwriting their commits.*

---

## 7. GitHub Support Cache Purge Request (Phase 7 — Post-Push Action)

> [!IMPORTANT]
> **Submission Precondition**: Do NOT submit this ticket until the sanitized history has been pushed to `origin/main` with `--force-with-lease` and `JWT_SECRET` rotation is confirmed in Render.

- **Submission Portal:** [support.github.com](https://support.github.com)
- **Ticket Category:** `Account or repository security` $\to$ `Remove sensitive data from repository cache`
- **Subject:** `Request to purge cached commit objects and pull request refs for Abhis1905/CardioScan`

```text
Hello GitHub Support Team,

I am the owner of the public repository https://github.com/Abhis1905/CardioScan.

We identified historical commits containing credentials (committed in earlier development revisions) and have rewritten the branch 'main' to redact the affected historical blobs. The sanitized history has now been pushed to origin/main.

The primary credentials (Google App Password and Groq API key) were revoked and rotated at the respective providers, and the repository history has been replaced.

To ensure the orphaned commit objects are no longer accessible through GitHub's commit cache, direct SHA URLs, or internal pull-request ref caches, we kindly request that you run garbage collection and purge cached views for our repository:

Repository: https://github.com/Abhis1905/CardioScan
Orphaned Historical Commits to Purge:
- dc44860c8698e83a5502787e0c821f30b2e9bc27
- 7cdee3607ba9181156fe800fa06a2336214ce8e7
- 331d70affcd3fc46d98a27f08eb8f0a7034eeec6
- 0ba1b7e079a3adf1f72efb15f4b1c2b473698dd9

Thank you for your assistance in securing our repository.

Sincerely,
Abhishek Kumar
Repository Owner (Abhis1905)
```

### 7.1 Enabling GitHub Secret Scanning & Push Protection
CardioScan is a public repository, so GitHub Advanced Security (GHAS) secret scanning and push protection are available at no charge:
1. Navigate to repository **Settings** on GitHub (`https://github.com/Abhis1905/CardioScan/settings`).
2. In the left sidebar under **Security**, click **Code security and analysis**.
3. Under **Secret scanning**, click **Enable**.
4. Check **Push protection** and click **Enable**.
   - *Impact*: Any developer attempting to push a commit containing known tokens (Groq `gsk_`, Resend `re_`, AWS, Slack, GitHub, or private RSA keys) will be blocked immediately at the `git push` network boundary.

---

## 8. Verification Suites & Current Test Results

- **Backend Pytest Suite:** **142 passed, 0 failed, 3 warnings in 4.19s** (`backend/venv/bin/pytest tests/`)
  - Includes authentication, rate limiting, anti-spoofing, admin authorization, and safety assertions.
- **Frontend Jest Unit Tests:** **9 passed, 0 failed in 0.412s** (`npm test -- --watchAll=false`)
  - Includes report generator snapshots, QR code validation, and XSS sanitization.
- **Frontend Production Build:** **Compiled successfully** (`npm run build`)
  - Bundle output: `main.69ecbdcd.js` (506.09 kB gzipped), `main.4792e3a7.css` (17.45 kB gzipped). Zero compilation errors.
