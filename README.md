# LifeSync

Turns any messy real-world input (voice, photos, documents, forwards, weather, news) into a structured, fact-checked action card, in the user's own Indian language, and says clearly what it could not verify.

> LifeSync is an AI assistant, not a doctor or emergency service.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel. Gemini via `@google/genai`, server-side only. No database, no accounts, nothing persisted.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Server-side only. |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.8-flash`. If that model is slow or overloaded, `gemini-3.5-flash` is a faster fallback. |
| `GOOGLE_MAPS_KEY` | no | Enables traffic times. App works without it. |

## Pages and languages

- `/` explains the product. `/try` is the assistant: describe the situation, optionally add voice, a photo/PDF or location, pick a reply language, and get the card. `/try?example=medical|flood|rumour` opens with an example filled in.
- The site is fully translated into English, Hindi, Bengali, Marathi, Telugu and Tamil (`lib/i18n/`, one typed dictionary per language, so a missing string fails `tsc`). The choice is saved in the browser. Users can still write or speak in any language; the card is answered in theirs.

## How it works

`POST /api/analyze` takes a multipart form (text, one voice clip, photos/PDFs/text files, optional location and reply language) and streams newline-delimited JSON progress events, then the card.

1. **Gather**: parse inputs and fetch live weather (Open-Meteo, falls back to Mumbai without location).
2. **Plan** (Gemini call 1, structured JSON): reads everything multimodally, detects the language, drafts the card, and suggests a news query and a destination type.
3. **Live data**: Google News RSS headlines, and drive time with traffic to the nearest matching place (Places + Routes API, only with `GOOGLE_MAPS_KEY` and location).
4. **Critic** (Gemini call 2, Google Search grounding): checks every claim, removes unsupported ones, returns sources. If it fails, the draft is shown as unverified with confidence capped at 40.
5. **Safety in code** (`lib/server/safety.ts`): fixed emergency numbers override model output, critical cases always start with a 112 call, calls and messages always need confirmation.

Every model reply is validated with zod and repaired once if needed. A Gemini 503 ("high demand") is retried once. All prompts are in `lib/server/prompts.ts`. Without `GEMINI_API_KEY`, the three examples still show their sample cards.

## Tests

```bash
npm test                                   # unit + component tests (Vitest)
npm run test:e2e                           # browser tests against the dev server (uses installed Edge)
BASE_URL=http://localhost:3005 npm run test:e2e   # against a production build (next build && next start -p 3005)
```

## Demo script

_TODO (Phase 4)._

## Known limitations

_TODO (Phase 4)._
