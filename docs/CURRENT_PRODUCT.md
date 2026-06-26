# Answerley: current product context

## Product definition

Answerley is a configurable AI answering service. It learns a business from
its website or business listing, creates an Answering Plan, lets the owner hear
and update the assistant immediately, and later handles real calls using the
approved plan.

The focused product promise is:

> Answer business calls, provide approved information, capture caller details,
> create requests, take messages, prepare follow-up, and route important calls
> according to one editable Answering Plan.

This is a focused complete product, not a claim to automate every back-office
system. Deep customer-account lookup, payments, order modification, medical
records, property-management records, and industry-specific systems are future
integrations rather than requirements for the core answering-service product.

## Core customer experience

A user should experience value before doing a long setup:

1. Enter a website or business.
2. Watch Answerley prepare the business assistant.
3. Make one browser test call.
4. See useful outputs appear beside the call.
5. Add or change missing business information without leaving the test.
6. Complete only live-critical decisions.
7. Save the setup.
8. Land on the standard Calls dashboard with the test call as the first record.
9. Connect a phone when ready.
10. Pay when activating real calls.

## The three AI roles

### Website Plan Builder — Gemini Flash text

Receives the Cheerio/context.dev extraction dump and builds the complete
canonical Answering Plan plus source metadata and unresolved conflicts.

### Plan Assistant — Gemini Flash text

Acts as the owner-side natural-language bridge to the plan. It can read the
current plan, answer questions about it, ask the minimum necessary
clarification, detect conflicts, and propose small validated JSON Patch
operations.

### Live Call Agent — Gemini Live speech-to-speech

Talks to callers using a layered runtime compiled from the active plan. It can
answer approved questions and invoke precise call tools. It cannot edit the
Answering Plan.

## Product scope across businesses

The architecture is vertical-neutral and suitable for businesses that need a
receptionist or answering service, including local services, professional
services, appointment businesses, property management front-door calls,
restaurants, real-estate offices, legal offices, clinics, and other businesses
whose calls usually end in one or more of these outcomes:

- approved question answered
- caller details collected
- appointment, reservation, consultation, quote, callback, service, or custom
  request captured
- message taken
- link prepared or sent
- business contact notified
- call transferred or routed
- safe fallback used when information is unknown

Different businesses use different plan items and toggles. They do not require
separate vertical products.

## Product boundaries

The focused product does not initially promise:

- authenticated customer-account lookup
- order or case modification
- payment processing during calls
- live inventory lookup
- industry-specific records or workflows not represented by generic requests
- enterprise call-center queues and workforce management
- direct regulated advice

Those can be added later through integration tools without changing the core
Answering Plan concept.

## Visual-first development rule

The founder controls development through rendered UI and customer behavior,
not by inspecting database rows or code. Foundations therefore need visual
verification surfaces:

- `/dev/answering-plan-lab`
- `/dev/contract-health`
- `/try`
- `/dashboard/calls`

A hidden subsystem is not considered complete until its effects can be tested
through those surfaces or another approved customer-facing screen.
