# Cultural Calendar — Architecture Notes

## What this is
A campaign planning intelligence prototype for Apple Pay Partner Marketing.
Browse cultural moments scored against a merchant catalog. All data is pre-seeded from V1.
No auth. No external APIs. Runs locally.

## Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Drizzle ORM + Neon (PostgreSQL)

## Key patterns
- All DB access goes through lib/db/index.ts (Drizzle singleton)
- Schema is in lib/db/schema.ts
- Seed data is in lib/seed.ts — run with: npx tsx lib/seed.ts
- API routes handle all data mutation; page components are Server Components where possible
- Scores are pre-seeded from V1 — no AI API needed

## Do not
- Put DB queries in page components — use lib/ functions or API routes
- Add auth — this is a no-auth prototype
- Add an AI/LLM integration — scores are hardcoded from V1 data
- Create separate CSS files — use Tailwind classes inline
