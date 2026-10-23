# Security

## Reporting a vulnerability

Please report security issues privately to the maintainer through GitHub's _Report a vulnerability_ button on this repository, rather than in a public issue. Include the steps to reproduce. You will get an answer within a few days.

## What LifeSync protects

- **No stored user data.** There are no accounts and no database. Inputs live only for the duration of one request, are sent only to Gemini and the live-data APIs (Open-Meteo, Google News, and Google Maps if configured), and are never logged.
- **Secrets stay on the server.** API keys are read and validated only in `lib/server/env.ts`, and lint rules stop client code from importing server modules.
- **The model is untrusted.**
  - Its input is fenced against prompt injection (`asData` in `lib/server/prompts.ts`).
  - Its output is schema-validated, bounded, and passed through code-level safety rules (`lib/server/safety.ts`).
  - It is rendered only as escaped text.
- **The endpoint is guarded**: same-origin check, rate limit, streaming body cap, and file-type detection by magic bytes (`lib/server/guard.ts`, `lib/server/input.ts`, `lib/server/sniff.ts`).
- **The browser is locked down** with a strict Content Security Policy and security headers (`next.config.ts`), verified by the end-to-end tests.

## Design notes

- Scripts allow `'unsafe-inline'` because pages are statically prerendered, and Next.js inlines its hydration data. Nonce-based CSP would force every page to render dynamically on each request. No user or model content is ever injected as HTML.
- The rate limiter is in memory, per server instance. For multi-region deployments, add Vercel WAF rules or a shared store.
