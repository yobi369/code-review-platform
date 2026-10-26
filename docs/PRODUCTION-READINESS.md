# Production Readiness Checklist

This is a release gate and records work still required; it does not claim that unperformed checks have passed.

## Implemented on the hardening branch

- [x] Ignore local environment files and generated dependencies in future commits.
- [x] Add a safe environment template, setup documentation, and security reporting policy.
- [x] Add bounded HTTP body parsing, baseline response security headers, health/readiness endpoints, and graceful shutdown.
- [x] Configure AI credentials through environment variables, enforce code-size limits, and set a provider timeout.
- [x] Add scrypt password hashing for new accounts and migrate legacy plaintext passwords after successful login.
- [x] Validate JWT bearer tokens, issuer, audience, expiry, and signing algorithm.
- [x] Scope review creation/listing to the authenticated owner.
- [x] Add focused AI input/configuration tests and CI checks.

## Required before production

- [x] CI passed for commit `dbad5ab083663c07c1d185602b4341e5c64d9b2a`: clean install, JavaScript syntax checks, automated tests, full high-severity dependency audit, Compose validation, and production Docker build. Re-run CI after subsequent changes.
- [ ] Rotate all real credentials ever committed; review Git history and coordinate any required history rewrite.
- [x] Remove tracked `node_modules` from the upgrade branch and remove the duplicate nested application tree; retain the root app as the canonical entrypoint.
- [x] Upgrade Express/Mongoose and refresh the lockfile; clean install and full dependency audit passed in CI.
- [ ] Test auth registration/login, legacy password migration, token expiry, review ownership isolation, duplicate usernames, and database errors against a disposable test database. Existing legacy review records without an owner cannot safely be assigned automatically; back up and explicitly migrate them if they contain data that must be retained.
- [x] Add bounded per-process rate limits to authentication and AI routes; [ ] replace the in-memory store with a shared store before horizontally scaling.
- [ ] Configure CORS allowlists and CSRF protections if cookie-based authentication is introduced.
- [ ] Validate provider output into a strict JSON schema; handle provider rate limits, retries, quotas, and cost controls.
- [ ] Add a documented privacy/retention policy for source code sent to an external provider.
- [ ] Implement authenticated real-time WebSocket collaboration if it remains a product requirement; current release is a browser/API review workspace, not a live collaborative editor.
- [ ] Configure database TLS, least-privilege credentials, backups, and successfully test a restore.
- [ ] Run staging smoke tests, accessibility checks, dependency scanning, SAST/DAST, load testing, and an independent security review.
- [ ] Verify HTTPS deployment, monitoring, alerts, rollback, and incident-response ownership.

## Known limitations

The current app is a hardening baseline, not yet production-ready. Legacy plaintext password compatibility remains until each existing user logs in. Legacy review records created before ownership fields existed are hidden by the new owner-scoped query; back up and explicitly migrate any records that must be retained. Existing historical credentials may remain in Git history even after current-tree environment files are removed. The repository has duplicate app directories and committed dependencies, and the real-time WebSocket service is not connected to the HTTP app. No live deployment, penetration test, load test, or backup restore is claimed.
