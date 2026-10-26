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

- [ ] Ensure the latest GitHub Actions run is green, including full dependency audit and Docker build.
- [ ] Rotate all real credentials ever committed; review Git history and coordinate any required history rewrite.
- [x] Remove tracked `node_modules` from the upgrade branch and remove the duplicate nested application tree; retain the root app as the canonical entrypoint.
- [x] Upgrade Express/Mongoose and refresh the lockfile; a clean install, full audit, tests, and Docker build must still pass in CI.
- [ ] Test auth registration/login, legacy password migration, token expiry, review ownership isolation, duplicate usernames, and database errors against a disposable test database.
- [x] Add bounded per-process rate limits to authentication and AI routes; [ ] replace the in-memory store with a shared store before horizontally scaling.
- [ ] Configure CORS allowlists and CSRF protections if cookie-based authentication is introduced.
- [ ] Validate provider output into a strict JSON schema; handle provider rate limits, retries, quotas, and cost controls.
- [ ] Add a documented privacy/retention policy for source code sent to an external provider.
- [ ] Integrate authenticated WebSocket collaboration into the main server or clearly remove the feature claim.
- [ ] Configure database TLS, least-privilege credentials, backups, and successfully test a restore.
- [ ] Run staging smoke tests, accessibility checks, dependency scanning, SAST/DAST, load testing, and an independent security review.
- [ ] Verify HTTPS deployment, monitoring, alerts, rollback, and incident-response ownership.

## Known limitations

The current app is a hardening baseline, not yet production-ready. Legacy plaintext password compatibility remains until each existing user logs in. Existing historical credentials may remain in Git history even after current-tree environment files are removed. The repository has duplicate app directories and committed dependencies, and the real-time WebSocket service is not connected to the HTTP app. No live deployment, penetration test, load test, or backup restore is claimed.
