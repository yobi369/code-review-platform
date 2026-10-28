# Security Policy

## Reporting a vulnerability

Please do not publish exploitable details in a public issue. Contact the repository maintainer privately through GitHub's security advisory feature, where available, and include affected paths, impact, and reproducible steps. Do not include real user data or secrets in reports.

## Current security expectations

- Never commit `.env` files, credentials, tokens, database URLs, or production data.
- Rotate any secret that may have been exposed in repository history; removing a file from the current branch does not invalidate historical copies.
- Keep dependencies patched and review `npm audit` output before releases.
- Treat AI-generated findings as untrusted suggestions; never execute suggested code automatically.
- Do not send confidential source code to external AI providers without authorization.

## Supported versions

No production release is currently designated as supported. Use only in a controlled development environment until the production-readiness checklist is satisfied.
