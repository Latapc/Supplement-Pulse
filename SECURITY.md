# Security and deployment notes

## Runtime data

The server creates its JSON files under `data/` at runtime. They can contain account password hashes, verification-email metadata, and users' supplement records, so they are ignored by Git. Never commit live runtime data or paste its contents into issues or logs.

Removing a file from the current branch does not remove it from earlier Git commits. If any tracked data ever contained real user information, rotate affected credentials and verification tokens and consider a coordinated history rewrite before making the repository public.

## Authentication

- Registration requires email/device verification before the account can sign in.
- Verification links display a confirmation page on GET and only authorize after an explicit POST, reducing accidental activation by email-link scanners.
- Passwords use PBKDF2-HMAC-SHA-512 with 210,000 iterations for new accounts. Existing accounts are upgraded after a successful login.
- Login, registration, and verification-email resend attempts are rate-limited per IP.
- Account sync and device-management routes require a bearer session token. Verification links and verification tokens are not returned by the security-mailbox API.
- Sessions currently live in process memory for up to seven days. Restarting the server invalidates sessions; a multi-instance deployment needs a shared session store and shared persistent database before relying on this custom auth flow for production.

## Deployment configuration

- `APP_BASE_URL`: canonical public base URL used to create verification links. Set this to the trusted HTTPS app origin; the server does not build links from an untrusted `Host` header.
- `CORS_ORIGINS`: comma-separated exact browser origins allowed to call the API. Configure this to the actual production web origin(s); the defaults are local development and Capacitor origins.
- `TRUST_PROXY=true`: set only when deployed behind one trusted reverse proxy that sanitizes forwarded headers. Leave unset otherwise.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` to deliver verification email. Do not expose verification links in client-facing diagnostics.
- Store secrets in the deployment platform's secret manager, not in source control.

## Validation

Before deploying, run:

```sh
npm ci
npm run lint
npm run build
```

Also test registration, verification, login from a trusted and untrusted IP, logout/session expiry, cloud save/load/delete, and denied cross-origin requests in a staging environment.
