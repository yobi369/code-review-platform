# Code Review Platform

A Node.js/Express and MongoDB starter for authenticated code reviews, with optional AI-assisted analysis and real-time collaboration components.

> **Status:** hardening in progress. This repository is not production-ready until the checks in `docs/PRODUCTION-READINESS.md` are completed. AI output is advisory and must be reviewed by a human.

## Features

- Express API for registration, login, and review workflows.
- MongoDB persistence through Mongoose.
- Optional AI analysis via an environment-configured provider; no API key is embedded in source.
- Health/readiness endpoints, bounded request bodies, baseline security headers, and graceful shutdown.
- GitHub Actions syntax checks on pushes and pull requests.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB instance reachable through `DATABASE_URL`

## Local setup

```bash
npm ci
cp .env.example .env
# Edit .env and set a unique JWT_SECRET and your MongoDB URL
npm start
```

The service listens on `PORT` (default `3001`). Check `GET /health` for process health and `GET /ready` for database readiness. Never use the example JWT secret outside local development.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | HTTP port (defaults to 3001) |
| `NODE_ENV` | No | Set `production` in deployment |
| `DATABASE_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes for auth | Long, random signing secret; keep it out of Git |
| `OPENAI_API_KEY` | No | Enables provider-backed AI analysis |
| `OPENAI_MODEL` | No | Model name supported by your account/provider |

## Security and deployment

Read [`SECURITY.md`](SECURITY.md) and [`docs/PRODUCTION-READINESS.md`](docs/PRODUCTION-READINESS.md). Configure GitHub secret scanning, push protection, Dependabot alerts, and code scanning in repository settings. Rotate any credential that has ever been committed; deleting a file does not erase it from Git history. Use a managed MongoDB deployment with authentication, TLS, backups, and least-privilege credentials. Do not submit secrets or proprietary code to an AI provider unless you are authorized to do so.

## Development notes

This project currently uses an older dependency stack and contains duplicated legacy folders. Review and consolidate those deliberately rather than assuming both copies are deployed. Run `npm audit` and test authentication, authorization, data isolation, and provider failure behavior before production use.

## License

No license is currently declared for this repository. Add an explicit license before accepting external contributions or granting reuse rights.
