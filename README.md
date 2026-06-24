# Answerley Foundation

A visual-first, git-ready foundation for a configurable AI answering service.
It turns the product direction into durable repository memory so later Codex
contexts can rehydrate from contracts instead of relying on chat history.

## What is included

- one canonical Answering Plan with knowledge, configuration, toggles, modes,
  conditions, actions, fallbacks, and metadata
- validated JSONB/Supabase architecture with atomic revision commit RPCs
- immutable plan versions, guest-session handoff, audit, and operational activity model
- shared RFC 6902 patch path for manual and Gemini-assisted updates
- Gemini Flash adapters for website-plan building, Plan Assistant, and Live
  runtime compilation
- layered Gemini Live runtime and precise tool manifest
- Cheerio scraper with fallback adapter contract
- visual Plan Lab and Contract Health pages
- one customer journey from business input to test, review, save, and Calls
- standard dashboard shell, Calls feed/detail, and Answering Plan overview
- Supabase SQL migration and RLS foundation
- unit tests for schema, integrity, readiness, patch guardrails, runtime coverage, and operations
- durable product/architecture docs and `AGENTS.md`

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- `http://localhost:3000/` — visible customer slice
- `http://localhost:3000/dev/answering-plan-lab` — canonical plan editor and runtime preview
- `http://localhost:3000/dev/contract-health` — cross-layer coverage audit
- `http://localhost:3000/app/calls` — standard Calls dashboard

The repository works without provider keys by using the foundation fixture and
local preview adapters. Add Gemini and Supabase environment variables to
replace the preview layers incrementally.

## Quality checks

```bash
npm run check
npm run build
```

The first command runs lint, TypeScript, and unit tests. The second creates the production build.

## Start here before Codex work

Read:

1. `FOUNDATION_STATUS.md`
2. `AGENTS.md`
3. `docs/FOUNDATION_MAP.md`
4. `docs/CURRENT_PRODUCT.md`
5. `docs/ANSWERING_PLAN_CONTRACT.md`
6. `docs/CURRENT_CUSTOMER_FLOW.md`
7. `docs/LIVE_RUNTIME.md`
8. `docs/OPERATIONAL_DATA_MAP.md`
9. `docs/INTEGRATION_BOUNDARIES.md`
10. `docs/CHANGE_PROTOCOL.md`
11. `docs/CODEX_HANDOFF.md`
12. `docs/CODEX_TASK_TEMPLATE.md`

## Database

The initial Supabase migration is:

```text
supabase/migrations/0001_answerley_foundation.sql
```

It has not been applied automatically. Review and apply it to the selected
Supabase project when the product slice is ready to move from local persistence.

## Foundation rule

A setting is not complete when it exists only in a component. It is complete
when it is represented in the canonical plan, visual editor, Plan Assistant,
Live runtime, operational consumers when relevant, tests, and Contract Health.
