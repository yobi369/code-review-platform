# Code Review Platform

An AI-assisted code review API built with Node.js, Express and MongoDB.

> **Status:** hardening in progress. Do not use for production or confidential source code until the remaining release gates in [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) are completed. AI findings are advisory and require human review.

## Current capabilities

- Responsive browser workspace for account registration/login, review creation/history, and AI-assisted code analysis.
- User registration and login with scrypt password hashing for new registrations.
- Short-lived JWT bearer tokens with issuer, audience and algorithm validation.
- Review creation, owner-scoped access, and review sharing with invited collaborators.
- Authenticated WebSocket rooms for persisted live comments, presence updates, and immediate access revocation.
- Optional AI-assisted review via an environment-configured provider.
- Health and database-readiness endpoints, request size limits, security headers, graceful shutdown, and per-process rate limits for authentication and AI analysis.
- GitHub Actions CI syntax checks, focused AI-service/rate-limit tests, dependency audit, and production-container build.

Legacy accounts created by the original version with plaintext passwords are upgraded to scrypt hashes after a successful login. This compatibility path should be treated as temporary and existing account data should be backed up before release.

## Requirements and local setup

Requires Node.js 20.19+ and a reachable MongoDB instance. For a containerized local setup, Docker Engine and the Docker Compose plugin are also supported.

```bash
npm ci
cp .env.example .env
# Set a strong unique JWT_SECRET and your DATABASE_URL
npm start
```

### Run with Docker Compose

```bash
cp .env.example .env
# Edit .env and replace JWT_SECRET with a unique random value of at least 32 characters.
docker compose up --build
```

Open `http://127.0.0.1:3001`. Compose stores local MongoDB data in a named volume and binds the web port to loopback only. AI analysis remains disabled until `OPENAI_API_KEY` is set. This is a local development setup, not a managed production deployment. Stop with `docker compose down`; use `docker compose down -v` only if you intentionally want to delete the local database volume.

- `GET /health` reports process health.
- `GET /ready` returns HTTP 200 only when MongoDB is connected.
- `POST /api/auth/register` accepts `username` and `password` (minimum 12 characters).
- `POST /api/auth/login` returns a short-lived bearer token.
- `POST /api/review` creates a review for the authenticated user.
- `GET /api/review` lists reviews you own or have been invited to collaborate on.
- `POST /api/review/:id/collaborators` invites an existing username (owner only).
- `DELETE /api/review/:id/collaborators/:username` revokes access (owner only).
- The browser opens a live room from a review card; WebSocket clients authenticate with their bearer token before receiving comments.
- `POST /api/review/analyze` accepts `code` and requires `OPENAI_API_KEY`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port, default 3001 |
| `NODE_ENV` | No | Use `production` in deployment |
| `DATABASE_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes for authentication | Unique random secret, at least 32 characters |
| `OPENAI_API_KEY` | No | Enables AI analysis |
| `OPENAI_MODEL` | No | Provider model, defaults to `gpt-4.1-mini` |

Never commit real environment files or use example secrets in a deployed environment. Do not send proprietary code to an external AI provider unless you are authorized to do so.

## Validation

```bash
npm ci
npm run check
npm test
npm audit
```

CI checks JavaScript syntax, focused AI/auth/rate-limit/HTTP/WebSocket-auth tests, dependency audit, Compose configuration, and a production Docker build. These checks are not substitutes for database-backed integration tests, penetration testing, or production smoke tests.

## Security and release

Review [SECURITY.md](SECURITY.md) and the [production readiness checklist](docs/PRODUCTION-READINESS.md). Express and Mongoose have been upgraded and the lockfile regenerated; CI now runs a full dependency audit. Review the current CI result before considering the dependency upgrade verified. Existing Git history may contain environment files; rotate any real credentials that may have been exposed and assess history cleanup separately. Configure secret scanning, push protection, Dependabot, database TLS, least-privilege access, backups, and tested restore procedures before handling real users' data.

## Known limitations

- Live WebSocket collaboration is implemented for owners and invited collaborators, but end-to-end multi-user/database tests remain outstanding.
- AI findings are returned as provider text and are not yet schema-validated into a typed issue model.
- Comprehensive database-backed auth/review/collaboration tests, distributed rate limiting for multiple app instances, broader abuse controls, and a tested deployment/restore procedure remain release blockers.
- No production deployment, penetration test, load test, or backup restore is claimed.

## License

No license has been selected for this repository yet. Add one explicitly before inviting external contributions or granting reuse rights.
