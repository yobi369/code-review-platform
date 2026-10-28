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
- [x] Validate AI output against a bounded JSON schema and document external source-code processing in `docs/AI-PRIVACY.md`.

## Required before production

- [x] CI passed for commit `33ee39e4aa33cd9c9ed7254ba30f1d2590dbb18e`: clean install, syntax checks, automated tests, MongoDB-backed collaboration integration tests, full high-severity dependency audit, Compose validation, and production Docker build. Re-run CI after subsequent changes.
- [ ] Rotate all real credentials ever committed; review Git history and coordinate any required history rewrite.
- [x] Remove tracked `node_modules` from the upgrade branch and remove the duplicate nested application tree; retain the root app as the canonical entrypoint.
- [x] Upgrade Express/Mongoose and refresh the lockfile; clean install and full dependency audit passed in CI.
- [x] Verify registration/login, review privacy before invitation, collaborator invitation, live comment persistence/broadcast, collaborator revocation, and denial of revoked reconnects against a disposable MongoDB service in CI.
- [x] Add a backup-first legacy review ownership audit/migration script that requires an explicit per-review owner mapping and never guesses ownership.
- [ ] Add cases for legacy plaintext-password migration, duplicate usernames, database failure paths, WebSocket reconnect/chaos, and broader permission edge cases. Run the legacy review migration against the actual deployment only after backing up the database and reviewing a complete mapping.
- [x] Add bounded per-process rate limits to authentication and AI routes; [ ] replace the in-memory store with a shared store before horizontally scaling.
- [ ] Configure CORS allowlists and CSRF protections if cookie-based authentication is introduced.
- [x] Validate provider output into a strict bounded JSON schema.
- [ ] Add provider retry strategy, usage quotas, and cost controls.
- [x] Document source-code processing expectations and deployment-owner privacy responsibilities in `docs/AI-PRIVACY.md`.
- [ ] Publish a user-facing privacy notice and verify the provider account's retention/data-processing settings before enabling real-user access.
- [x] Integrate authenticated WebSocket rooms with owner/collaborator authorization, persisted comments, presence updates, per-connection rate limits, and token-expiry handling.
- [ ] Configure database TLS, least-privilege credentials, backups, and successfully test a restore.
- [ ] Run staging smoke tests, accessibility checks, dependency scanning, SAST/DAST, load testing, and an independent security review.
- [ ] Verify HTTPS deployment, monitoring, alerts, rollback, and incident-response ownership.

## Known limitations

The current app is a hardening baseline, not yet production-ready. Legacy plaintext password compatibility remains until each existing user logs in. Legacy review records created before ownership fields existed are hidden by the new owner-scoped query; back up and explicitly migrate any records that must be retained. Existing historical credentials may remain in Git history even after current-tree environment files are removed. The current tree is consolidated and the real-time WebSocket service is attached to the HTTP server. The main multi-user collaboration flow passes a MongoDB-backed CI integration suite; load, chaos, and production-environment verification remain outstanding. No live deployment, penetration test, load test, or backup restore is claimed.
