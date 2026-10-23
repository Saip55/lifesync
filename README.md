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
| `GEMINI_MODEL` | no | Defaults to `gemini-3.8-flash`. |
| `GOOGLE_MAPS_KEY` | no | Enables traffic times. App works without it. |

## How it works

_TODO (Phase 1-2): Plan → Critic pipeline, live signals, safety rules._

## Demo script

_TODO (Phase 4)._

## Known limitations

_TODO (Phase 4)._
