# Foundation-safe product change protocol

The foundation is designed to change. The goal is not to prevent product
iteration; it is to make every iteration visible and complete.

## Before implementation

For any meaningful feature or UX change, Codex should inspect and report:

1. Is this UI-only or does it change canonical meaning?
2. Which Answering Plan fields or primitives are affected?
3. Do existing plans need a default or migration?
4. Which manual editor changes?
5. Which Plan Assistant operations change?
6. Which Gemini Live runtime layers or tools change?
7. Which operational records or dashboard tabs change?
8. Which readiness rules change?
9. Which tests and Contract Health rows change?
10. Which current-flow or decision documents change?

Do not code a foundation-changing request before producing this impact report.

## Change classes

### Class A — presentation only

Examples: move signup, merge onboarding screens, rename a button, restyle a
card. The canonical plan is unchanged.

### Class B — additive configuration

Examples: add a follow-up sending window or a new intake field type. Add schema
field/default, registry rule, UI, assistant edit, runtime handling, and tests.

### Class C — behavior-semantic change

Examples: redefine what booking confirmation means or change how scenarios
resolve. Requires migration and explicit runtime compatibility review.

### Class D — new operational subsystem

Examples: payments, telephone provisioning, calendar connection. Usually adds
relational records and provider adapters while keeping the plan’s intent field
or connection reference small.

## Required completion loop

```text
impact report
→ contract/default/migration
→ visible UI
→ assistant operation
→ runtime/compiler/tool update
→ operational update when needed
→ tests
→ Contract Health green
→ browser review
→ decision log
```

## Prompt template for future Codex tasks

```text
Before implementing this request, read AGENTS.md and the current product docs.
Produce an impact report covering the canonical Answering Plan, field registry,
readiness rules, manual UI, Plan Assistant, Gemini Live runtime, operational
records, migrations, fixtures, tests, Contract Health, and customer flow.

Separate UI-only effects from foundation effects. Do not invent a competing
configuration format. After approval, implement all affected layers together,
exercise the complete visible journey in the browser, and update DECISIONS.md.
```
