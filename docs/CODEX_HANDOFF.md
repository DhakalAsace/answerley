# Codex handoff and next build sequence

## What this repository already establishes

- canonical Answering Plan schema
- field registry and conditional readiness
- source metadata
- shared manual/AI patch path
- plan revisions and immutable-version database model
- Gemini text adapters for plan building, plan assistance, and runtime compilation
- layered Gemini Live runtime schema and tool manifest
- runtime coverage validation and revision cache model
- Cheerio scraper and context.dev fallback interface
- operational schemas, guest-session handoff, provider contracts, and Supabase migration
- visual Answering Plan Lab
- visual Contract Health matrix
- one visible customer slice
- standard Calls dashboard and test-call detail
- dashboard shell and Answering Plan overview
- tests for schema, integrity, patch guardrails, readiness, runtime coverage, and operational invariants

## Recommended next tasks

### 1. Replace fixture import with real website import

Wire `/try` to:

```text
submitted website/business
→ Cheerio scraper
→ context.dev fallback when configured
→ Gemini Flash Website Plan Builder
→ validated Answering Plan envelope
→ same existing test UI
```

Do not redesign the approved customer slice during this task.

### 2. Wire real Gemini Live browser audio

Use the compiled runtime, precise tool manifest, transcript stream, barge-in,
and test-mode action records. Keep the existing test UI.

### 3. Make Update Answerley refresh the active test

Apply a validated plan patch, increment revision, compile/cache a new runtime,
and refresh or resume the Live session without exposing a separate teaching
mode.

### 4. Add movable Supabase authentication gate

Preserve guest plan, metadata, revisions, and test call across Google or email
sign-in. The gate should remain movable without changing the flow architecture.

### 5. Replace local fixture persistence with Supabase

Persist guest sessions, businesses, plans, immutable versions, changes,
runtime compilations, source documents, calls, events, transcripts, requests,
messages, improvement suggestions, and audit events using the existing
migration, atomic revision RPCs, and RLS.

### 6. Build each standard dashboard screen

Use one journey-specific task at a time. Every Answering Plan configuration
screen reads/writes the same plan. Activity screens read relational records.

### 7. Phone/SIP activation

Build the visible Connect phone flow, then place telephony behind provider
interfaces. Real calls always use the active published plan version.

### 8. Stripe

Implement checkout, subscription webhooks, entitlements, portal, and billing
UI when live-call activation is ready.

## Task format

Every Codex task should state:

- user-visible goal
- starting screen
- exact click path
- expected states
- canonical objects affected
- operational records affected
- acceptance checks
- desktop/mobile screenshot requirement

Do not issue broad prompts such as “build the full product.”
