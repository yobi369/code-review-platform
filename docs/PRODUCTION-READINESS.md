# Production Readiness Checklist

This checklist is a release gate. It records implemented controls and outstanding verification separately; it does not claim that unperformed checks have passed.

## Implemented on the hardening branch

- [x] Ignore local environment files and generated dependencies in future commits.
- [x] Add an environment template, setup documentation, and security reporting policy.
- [x] Add bounded HTTP body parsing, baseline response security headers, health/readiness endpoints, and graceful shutdown.
- [x] Configure AI credentials through environment variables, enforce code-size limits, and set a provider timeout.
- [x] Add scrypt password hashing for new accounts and upgrade legacy plaintext passwords after successful login.
- [x] Validate JWT bearer tokens, issuer, audience, expiry, and signing algorithm.
- [x] Scope review creation/listing to the authenticated owner and add owner-managed collaborator invitations/revocation.
- [x] Validate AI output against a bounded JSON schema and document external source-code processing in `docs/AI-PRIVACY.md`.
- [x] Add authenticated WebSocket rooms, persisted comments, presence updates, connection limits, token-expiry handling, and active-session revocation.
- [x] Add a backup-first legacy review ownership audit/migration script requiring explicit per-review owner mapping; it never guesses ownership.
- [x] Add unit/HTTP tests and MongoDB-backed integration tests for legacy password migration, duplicate registration, review privacy, collaboration, comment persistence/broadcast, and revocation.
- [x] Add GitHub Actions checks for clean dependency install, syntax, tests, dependency audit, Compose validation, and production container build.

## Required before production

- [ ] Re-run and confirm all CI checks on the latest branch commit after the latest integration-test and documentation changes.
- [ ] Rotate all real credentials ever committed; review Git history and coordinate any required history rewrite.
- [x] Remove tracked `node_modules` from the hardening branch and remove the duplicate nested application tree; retain the root app as the canonical entrypoint.
- [x] Upgrade Express/Mongoose and refresh the lockfile; a prior CI run passed the full high-severity dependency audit. Confirm again on the latest commit.
- [ ] Add tests for database failure paths, WebSocket reconnect/chaos, and broader permission edge cases.
- [ ] If legacy review records must be retained, back up the actual deployment database, review a complete owner mapping, and run the migration deliberately. Never guess ownership.
- [x] Add bounded per-process rate limits to authentication and AI routes; [ ] replace the in-memory store with a shared store before horizontally scaling.
- [ ] Configure CORS allowlists and CSRF protections if cookie-based authentication is introduced.
- [ ] Add provider retry strategy, usage quotas, and cost controls.
- [ ] Verify the AI provider account's retention/data-processing settings before enabling real-user access; the published privacy notice does not replace this check.
- [ ] Configure production database TLS, least-privilege credentials, scheduled backups, and successfully test a restore.
- [ ] Run staging smoke tests, accessibility checks, SAST/DAST, load testing, and an independent security review.
- [ ] Verify HTTPS deployment, monitoring, alerts, rollback, and incident-response ownership.

## Known limitations

This is a hardened development baseline, not a verified production deployment. Legacy plaintext-password compatibility remains until each existing user logs in successfully. Legacy reviews without owner IDs are hidden until explicitly mapped to owners. Current-tree environment files are excluded, but old credentials may remain in Git history and must be rotated if exposed. Rate limits are process-local and do not coordinate across instances. Provider retention settings, usage budgets, production database TLS, operational backups/restores, staging acceptance, load testing, and independent security review are not verified. No live deployment, penetration test, load test, or backup restore is claimed.
