# Small Business Answering

A focused answering service for small businesses. The core promise: enter a
website or business name, build an answering setup, preview/test it, and only go
live after approval.

The project is pivoting from the older Answerley foundation into a narrower
small-business product. The legacy Answering Plan engine still exists as a
compatibility layer while the focused Answering Setup contract grows.

## Current product scope

Small Business Answering should answer missed, overflow, and after-hours calls;
capture caller details; handle appointment requests safely; route urgent calls;
filter spam; send owner alerts; and let the owner review/test everything before
going live.

The product should not become a CRM, workflow builder, call-center suite,
generic AI platform, prompt playground, or full phone-system replacement.

## What is included now

- focused product spec in `docs/SMALL_BUSINESS_ANSWERING_FOCUSED_PRODUCT_SPEC.md`
- focused setup contract in `src/domain/small-business-answering`
- approval-first landing page and browser test flow
- dashboard shell with focused navigation: Overview, Calls, Requests,
  Appointments, Test Center, Answering Setup, Phone Setup, Billing, Settings
- setup readiness gates for review, alerts, phone routing, billing, and final test
- legacy Answering Plan runtime, website import, patching, and tests for reuse
  during the pivot
- Supabase SQL migration and RLS foundation from the older architecture

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- `http://localhost:3000/` - customer landing page
- `http://localhost:3000/try?business=example.com` - browser setup/test flow
- `http://localhost:3000/dashboard/overview` - focused owner dashboard
- `http://localhost:3000/dashboard/answering-setup` - setup review surface
- `http://localhost:3000/dev/answering-plan-lab` - legacy plan/runtime lab

The repository works without provider keys by using fixtures and local preview
adapters. Add provider and Supabase environment variables to replace preview
layers incrementally.

## Quality checks

```bash
npm run check
npm run build
```

The first command runs lint, TypeScript, and unit tests. The second creates the production build.

## Start here before Codex work

Read:

1. `docs/SMALL_BUSINESS_ANSWERING_FOCUSED_PRODUCT_SPEC.md`
2. `AGENTS.md`
3. `src/domain/small-business-answering/schema.ts`
4. `src/domain/small-business-answering/readiness.ts`
5. `docs/ANSWERING_PLAN_CONTRACT.md`
6. `docs/OPERATIONAL_DATA_MAP.md`
7. `docs/INTEGRATION_BOUNDARIES.md`
8. `docs/CHANGE_PROTOCOL.md`

## Database

The initial Supabase migration still uses the old foundation filename:

```text
supabase/migrations/0001_answerley_foundation.sql
```

It has not been applied automatically. Review and apply it to the selected
Supabase project when the product slice is ready to move from local persistence.

## Product rule

A setting is not complete when it exists only in a component. It is complete
when it is represented in the focused setup contract, owner-facing UI, runtime
or compatibility layer when affected, operational consumers when relevant, and
tests.
