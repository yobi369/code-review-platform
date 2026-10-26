# Production Readiness Checklist

This is a practical release gate, not a claim that the application has passed these checks.

## Implemented in this hardening branch

- [x] Ignore local environment files and generated dependencies in future commits.
- [x] Provide a safe environment-variable template.
- [x] Add basic HTTP security headers, bounded JSON/form payloads, health/readiness endpoints, and graceful shutdown.
- [x] Remove the hard-coded AI provider placeholder and fail clearly when AI is not configured.
- [x] Add CI syntax checks.

## Required before real users or production data

- [ ] Rotate credentials previously committed and review Git history; purge history only with a coordinated rewrite if required.
- [ ] Remove tracked `.env` files from every legacy folder and confirm `.gitignore` is effective.
- [ ] Upgrade and pin the outdated dependency stack; resolve `npm audit` findings.
- [ ] Add automated tests for registration/login, password hashing, token expiry, authorization, validation, and review ownership.
- [ ] Verify passwords use a modern password hash (Argon2id or bcrypt) and rate-limit authentication endpoints.
- [ ] Enforce review ownership/tenant boundaries and safe error responses.
- [ ] Configure CORS allowlists, CSRF protection if cookie auth is used, and trusted proxy settings appropriate to the host.
- [ ] Add database indexes, least-privilege credentials, TLS, backups, and a tested restore procedure.
- [ ] Validate AI response schemas, timeouts, token/cost limits, prompt-injection handling, and data-retention policy.
- [ ] Add structured redacted logging, monitoring, alerting, and abuse/rate controls.
- [ ] Run dependency, SAST, DAST, accessibility, load, and end-to-end tests against a staging deployment.
- [ ] Verify production deployment URL, HTTPS, health checks, rollback, and incident-response ownership.

## Known limitations

The repository contains duplicated root and nested application files, an old dependency stack, and committed environment files in its existing history. CI syntax checks are not a substitute for functional/security testing. No live deployment, external penetration test, backup restore, or load test is claimed by this document.
