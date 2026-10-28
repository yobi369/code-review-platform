# Code Review Platform

A collaborative code review workspace built with Node.js, Express, MongoDB, WebSockets, and optional AI-assisted analysis.

> **Release status:** security-hardening and integration work is in progress. Do not use this branch for production or confidential source code until the release gates in [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) have been completed. AI findings are advisory and require human review.

## Capabilities

- Responsive browser workspace for account registration/login, review creation/history, and AI-assisted analysis.
- Scrypt password hashes for new accounts, with a temporary compatibility path that upgrades legacy plaintext passwords after a successful login.
- Short-lived JWT bearer tokens validated for signing algorithm, issuer, audience, and expiry.
- Owner-scoped review access and invitations for existing collaborators.
- Authenticated WebSocket review rooms with persisted comments, presence updates, token-expiry handling, per-connection limits, and access revocation that terminates active sessions.
- Optional provider-backed AI analysis with bounded input, timeout handling, schema-validated JSON results, and accessible severity cards.
- User-facing [AI source-code privacy notice](docs/AI-PRIVACY.md) describing external processing considerations.
- Health/readiness endpoints, bounded request bodies, baseline security headers, graceful shutdown, and per-process authentication/AI rate limits.
- Docker-based local setup with MongoDB persistence, plus GitHub Actions checks for syntax, tests, dependency audit, Compose configuration, container build, and MongoDB-backed integration flows.

## Requirements and local setup

Requires Node.js 20.19+ and a reachable MongoDB instance. Docker Engine and the Docker Compose plugin are supported for the containerized local setup.

```bash
npm ci
cp .env.example .env
# Set a strong unique JWT_SECRET and your DATABASE_URL.
npm start
```

### Run with Docker Compose

```bash
cp .env.example .env
# Edit .env and replace JWT_SECRET with a unique random value of at least 32 characters.
docker compose up --build
```

Open `http://127.0.0.1:3001`. Compose stores local MongoDB data in a named volume and binds the web port to loopback only. AI analysis remains disabled until `OPENAI_API_KEY` is configured. This is a local development setup, not a managed production deployment. Stop with `docker compose down`; use `docker compose down -v` only if you intentionally want to delete the local database volume.

## API overview

- `GET /health` — process health.
- `GET /ready` — returns HTTP 200 only when MongoDB is connected.
- `POST /api/auth/register` — accepts `username` and `password` (password length 12–256 characters).
- `POST /api/auth/login` — returns a short-lived bearer token.
- `POST /api/review` — creates a review for the authenticated user.
- `GET /api/review` — lists reviews you own or have been invited to collaborate on.
- `POST /api/review/:id/collaborators` — owner invites an existing username.
- `DELETE /api/review/:id/collaborators/:username` — owner revokes collaborator access.
- `POST /api/review/analyze` — accepts source code and requires `OPENAI_API_KEY`.

The browser workspace opens live rooms from review cards. WebSocket clients must authenticate with a bearer token before receiving review comments.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port; defaults to 3001 |
| `NODE_ENV` | No | Set to `production` in deployment |
| `DATABASE_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes for authentication | Unique random secret of at least 32 characters |
| `OPENAI_API_KEY` | No | Enables AI analysis |
| `OPENAI_MODEL` | No | Provider model; defaults to `gpt-4.1-mini` |

Never commit real environment files or use example secrets in a deployed environment. Do not submit proprietary code to an external provider unless you are authorized to do so and have checked the provider's retention and data-processing settings.

## Legacy review data

The original version stored review sessions without an owner field. The upgraded API hides those records until ownership is explicitly assigned. Back up the database first, then run:

```bash
node scripts/migrate-legacy-reviews.js
```

This audit-only command creates a private JSON backup and reports legacy records. To apply ownership, prepare a JSON object mapping **every** legacy review `_id` to the intended existing user `_id`, then run:

```bash
node scripts/migrate-legacy-reviews.js --apply ./your-local-owner-map.json
```

Keep the mapping and backup out of Git. The script requires a complete explicit mapping and creates a fresh backup before changing records. Review the backup and mapping carefully before applying; the tool never guesses ownership.

## Validation

```bash
npm ci
npm run check
npm test
npm audit
```

GitHub Actions also runs MongoDB-backed integration tests covering registration/login, legacy password upgrade, duplicate registration, review isolation, collaborator invitations, live comment persistence/broadcast, and revocation. These checks are valuable automated evidence, not substitutes for production smoke tests, accessibility checks, load testing, or independent security review.

## Security and release

Read [SECURITY.md](SECURITY.md) and the [production-readiness checklist](docs/PRODUCTION-READINESS.md). Express and Mongoose have been upgraded and the lockfile refreshed; CI performs a full dependency audit. Existing Git history may still contain old environment files or credentials even though the current tree excludes local secrets. Rotate any real credentials that may have been exposed and assess history cleanup separately.

Before real-user deployment, configure production database TLS and least-privilege credentials, shared rate limiting for multi-instance deployments, monitoring and alerting, provider usage/retention controls, scheduled backups and a successfully tested restore. Complete staging smoke tests, accessibility checks, security testing, and load tests.

## Known limitations

- Rate limits are stored in process memory; they are not shared across multiple app instances.
- Legacy plaintext-password compatibility remains until each existing user logs in successfully.
- Legacy reviews without owner IDs require backup and explicit ownership mapping before they can be made visible.
- Production database TLS, operational backups/restore, shared rate limiting, provider usage budgets, monitoring, staging acceptance, load tests, and independent security review are not verified here.
- No live hosted deployment, penetration test, load test, or backup restore is claimed.

## License

No license has been selected for this repository yet. Add one explicitly before inviting external contributions or granting reuse rights.
