# Answerley foundation map

This is the founder-level map of the product. It describes what connects to
what without requiring database or code inspection.

## One configuration truth

```text
Website/business input
        ↓
Cheerio + fallback extraction
        ↓
Gemini Flash Website Plan Builder
        ↓
Canonical Answering Plan
        ├── visual Answering Plan editors
        ├── owner-side Plan Assistant
        ├── readiness and missing-item checks
        ├── business-specific test suggestions
        └── Gemini Flash Live Runtime Compiler
                    ↓
            Gemini Live call agent
                    ↓
       calls / events / requests / messages
```

The Answering Plan contains business knowledge and behavior configuration. It
includes content, toggles, modes, conditions, actions, recipients, fallbacks,
approved wording, and source metadata.

There is no separate onboarding plan, dashboard plan, or voice plan.

## What is fixed versus flexible

### Architectural contracts

- one canonical Answering Plan
- one validated change path for manual and AI edits
- stable IDs and cross-reference integrity
- plan revisions and immutable snapshots
- activity records outside the plan
- caller agent cannot edit the plan
- owner-side assistant can propose surgical changes
- runtime compiled and cached by plan revision
- every call remembers the plan version it used

### Product choices that may change safely

- onboarding screen count
- signup placement
- paywall placement
- copy and labels
- card layout
- section order
- whether editing is conversational, visual, or both
- which settings are shown during initial setup
- exact Gemini model IDs

## Configuration versus activity

### Canonical Answering Plan

- business profile
- temporary updates
- offerings and pricing behavior
- hours and after-hours behavior
- locations and coverage
- FAQs and policies
- request types
- custom intake fields
- booking behavior
- call scenarios
- contacts, teams, routing, and escalation
- follow-up and owner-alert rules
- unknown-question handling
- spam screening
- greeting, voice, tone, and language
- reusable links
- global caller-behavior rules

### Operational records

- guest sessions
- calls
- transcript turns
- call events
- requests
- messages
- plan-improvement suggestions
- phone numbers and forwarding state
- integrations
- usage
- subscriptions
- audit events

## Visual verification surfaces

### `/dev/answering-plan-lab`

Confirms that the canonical plan can populate visual editors, accept manual or
natural-language changes, calculate readiness, generate test prompts, and
produce a layered Live runtime.

### `/dev/contract-health`

Shows whether every planned capability has a canonical model, visual consumer,
Plan Assistant operation, Live runtime consumer, operational consumer, and
check.

### `/try`

The first customer slice: business input, build state, one browser test,
Update Answerley, visible call outputs, critical review, save, and Calls.

### `/app/calls`

The standard dashboard feed. The test call becomes the first record and uses
the same shape as future live calls.

## Safe change path

Every foundation-level product change must update the affected layers together:

1. canonical schema
2. field registry and conditional requirements
3. plan integrity rules
4. fixture/default migration
5. visual editor
6. Plan Assistant operations
7. Live runtime compiler and tool coverage
8. operational records when relevant
9. tests, Contract Health, and docs

Codex should produce an impact report before implementing a change that affects
canonical meaning.
