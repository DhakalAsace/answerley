# Small Business Answering repository context

This project is pivoting from the broader Answerley foundation into a focused
small-business answering service. The product promise is simple: enter a
website or business name, build an answering setup, test it, and go live only
after the owner approves.

Primary product object: Answering Setup.

Do not lead product work with AI platform, CRM, workflow-builder, call-center,
or enterprise language. The paying buyer wants calls answered correctly,
details captured, urgent calls routed, spam filtered, and owner alerts sent.

## Product-development method

The rendered, working customer experience is the founder's primary source of
truth. Build one visible customer journey at a time:

UI -> real behavior -> browser verification -> visual refinement.

Current screen count, layout, copy, signup placement, payment placement, and
interaction details may change as the founder uses the product. Do not treat
those as architectural invariants. When a product decision is ambiguous, ask
rather than inventing a permanent flow.

## Focused product boundaries

Build for:

- missed, overflow, and after-hours answering
- approved business answers from website and owner edits
- caller detail capture, messages, and appointment requests
- urgent-call detection and owner/on-call routing
- owner alerts and caller confirmations
- spam screening and clear usage visibility
- browser testing, phone setup, payment, and final approval gates

Avoid:

- full CRM pipeline
- arbitrary workflow builder
- AI prompt playground
- omnichannel inbox
- enterprise call-center analytics
- full phone-system replacement
- outbound campaigns, review campaigns, or native caller payments

## Architectural invariants

- `src/domain/small-business-answering` is the focused setup contract for new
  product work.
- `src/domain/answering-plan` remains a legacy compatibility engine while the
  focused setup contract grows. Do not expand it into a broader product surface
  unless the focused setup contract also changes.
- Onboarding, dashboard editing, browser testing, runtime compilation, and live
  calls must not create competing setup formats.
- Calls, call events, transcripts, requests, messages, phone numbers, usage,
  integrations, and subscriptions are operational records outside the setup.
- Every live call must record the immutable setup version it used.
- Caller-facing runtime code cannot mutate the approved setup. Owner-side tools
  may propose or apply validated owner-approved changes.
- Mockup names, industries, services, calls, and other sample content are
  fixtures only. Never turn them into product logic.

## Contract-change rule

Never add a capability only to one surface. When the Answering Setup changes,
update together:

1. focused Zod/JSON Schema contract
2. fixture/default behavior and readiness gates
3. owner-facing setup UI
4. onboarding/test flow
5. runtime/compiler compatibility where affected
6. operational consumers when affected
7. tests
8. relevant docs and decision notes

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

- `docs/SMALL_BUSINESS_ANSWERING_FOCUSED_PRODUCT_SPEC.md`
- `src/domain/small-business-answering/schema.ts`
- `src/domain/small-business-answering/readiness.ts`
- `docs/ANSWERING_PLAN_CONTRACT.md`
- `docs/OPERATIONAL_DATA_MAP.md`
- `docs/INTEGRATION_BOUNDARIES.md`
- `docs/CHANGE_PROTOCOL.md`
