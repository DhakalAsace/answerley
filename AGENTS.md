# Answerley repository context

Answerley is a configurable AI answering service. A visitor supplies a website
or business, Answerley creates one structured Answering Plan, and the visitor
can immediately test a browser voice assistant. The same plan later powers the
standard dashboard and live telephone calls.

## Product-development method

The rendered, working customer experience is the founder's primary source of
truth. Build one visible customer journey at a time:

UI → real behavior → browser verification → visual refinement.

Current screen count, layout, copy, signup placement, payment placement, and
interaction details may change as the founder uses the product. Do not treat
those as architectural invariants. When a product decision is ambiguous, ask
rather than inventing a permanent flow.

## Architectural invariants

- There is one canonical Answering Plan.
- Onboarding, manual dashboard editing, the owner-side Plan Assistant, browser
  testing, runtime compilation, and live calls must not create competing plan
  formats.
- The plan contains both business knowledge and behavior configuration,
  including enabled states, modes, conditions, actions, recipients, fallbacks,
  and approved wording.
- Calls, call events, transcripts, requests, messages, phone numbers, usage,
  integrations, and subscriptions are operational records outside the plan.
- Every call records the immutable Answering Plan version it used.
- Manual UI edits and Gemini-assisted edits use the same validated patch path.
- Gemini may translate, recommend, ask clarifying questions, and compile. The
  validated canonical plan remains authoritative.
- The caller-facing Live agent cannot mutate the Answering Plan. The owner-side
  Plan Assistant can propose changes.
- Mockup names, industries, services, calls, and other sample content are
  fixtures only. Never turn them into product logic.
- The product remains vertical-neutral. Business type may improve defaults but
  must not create a separate product architecture.

## Contract-change rule

Never add a capability only to one surface. When the Answering Plan changes,
update together:

1. Zod/JSON Schema contract
2. field registry and conditional requirement rules
3. plan fixture and migration/default behavior
4. visual Plan Lab/editor
5. Plan Assistant operations
6. Gemini Live runtime compilation and coverage map
7. operational consumers when affected
8. tests and Contract Health
9. relevant docs and decision log

Before a meaningful product change, produce an impact report covering those
nine areas. Do not implement a foundation-changing request until the impact is
understood.

## Visible definition of done

A user-facing feature is complete only after it is exercised in a browser:

- normal, loading, empty, error, and completed states
- desktop and mobile layouts
- the full click path from the prior visible step
- real or deliberately simulated behavior, clearly represented in the UI
- persistence after refresh where the product promises persistence
- final screenshots and an exact founder-review path

Do not report backend code, a schema, or an API integration as a completed
product feature unless its result is visible and usable.

## Current sources of truth

Read these before product work:

- `docs/FOUNDATION_MAP.md`
- `docs/CURRENT_PRODUCT.md`
- `docs/ANSWERING_PLAN_CONTRACT.md`
- `docs/CURRENT_CUSTOMER_FLOW.md`
- `docs/OPERATIONAL_DATA_MAP.md`
- `docs/LIVE_RUNTIME.md`
- `docs/INTEGRATION_BOUNDARIES.md`
- `docs/CHANGE_PROTOCOL.md`
- `docs/DECISIONS.md`
- `docs/CODEX_TASK_TEMPLATE.md`
