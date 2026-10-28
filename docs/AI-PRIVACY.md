# Source Code Privacy and AI Processing

## What is sent to the AI provider

When an authenticated user calls `POST /api/review/analyze`, the submitted code is sent to the configured external AI provider using `OPENAI_API_KEY`. The request is not stored by this application as a review record. However, the provider processes the request under the account's applicable terms, settings, and retention policies.

## User responsibilities

- Do not submit passwords, API keys, private keys, personal data, customer data, or confidential source code unless you are authorized to do so.
- Remove secrets and unrelated proprietary content before requesting analysis.
- Treat all findings and suggested fixes as untrusted advisory output. Review and test suggestions before applying them.
- Use an organization-approved provider account and confirm its retention and data-processing terms before enabling the feature for a team.

## Application behavior

The API limits submitted code to 20,000 characters, uses a request timeout, and validates the returned review against a strict schema. The app does not execute submitted code or AI suggestions. Request bodies and source code must not be added to logs, analytics, or support tickets.

## Deployment owner checklist

Before enabling AI analysis for real users, publish a user-facing privacy notice, decide whether AI analysis is optional, document provider and retention settings, configure budget/usage alerts, and provide a process for deleting user data where applicable. This document is not legal advice.
