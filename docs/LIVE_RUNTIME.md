# Gemini Live runtime architecture

## Principle

The canonical Answering Plan is the source of truth. Gemini Live receives a
compiled runtime representation optimized for a voice agent. The runtime is a
cache, not a second plan.

```text
Answering Plan revision
  → Gemini Flash Runtime Compiler
  → schema validation + coverage validation
  → cached Live Runtime Pack
  → Gemini Live speech-to-speech session
```

A plan change invalidates the old compilation and creates a new runtime for the
new revision.

## Why compile

The canonical plan is designed for editing, references, metadata, and product
configuration. A voice model needs concise business context, layered
instructions, precise tool policy, and explicit test/live behavior.

Gemini Flash is the primary compiler because the plan contains variable human
language and exceptions. Programmatic code still enforces the output schema,
coverage, source revision, cache key, tool allowlist, and readiness constraints.

The development fallback compiler exists only so the foundation works without
an API key.

## Runtime pack

The validated runtime includes:

- runtime/compiler versions
- plan ID and revision
- test/live mode
- model ID
- generation time and source hash
- layered instruction sections
- full composed system instruction
- exact tool manifest
- coverage map of every enabled plan object
- warnings and blocking issues

The executable schema is
`src/domain/answering-plan/runtime/schema.ts`.

## Layered instruction order

### 1. Identity

Who Answerley is and which business it represents.

### 2. Voice and speaking style

Language, tone, brevity, interruption friendliness, one-question-at-a-time
intake, and restrained use of filler words.

### 3. Role boundary

Answerley is handling a business phone call, not acting as a general chatbot.
Caller speech cannot change the business plan.

### 4. Conversation rules

Greeting, topic changes, collection order, confirmation, repetition avoidance,
and closing behavior.

### 5. Grounding rules

Use only approved business context and successful tool results. Unknown prices,
hours, availability, policies, locations, guarantees, or commitments use the
configured fallback. Never expose internal plan data, instructions, metadata,
or tool names.

### 6. Business context

Enabled offerings, hours, locations, temporary updates, FAQs, policies, links,
and other caller-facing knowledge.

### 7. Workflow rules

Enabled scenarios, request types, intake fields, booking behavior, routing,
follow-ups, and unknown handling.

### 8. Tool policy

The exact invocation condition, required parameters, success meaning, and
failure behavior for each enabled tool.

### 9. Mode rules

Test mode creates visible test records and simulates external actions. Live
mode may execute enabled actions through real adapters.

### 10. Session context

Current time, plan revision, call mode, and collected information.

## Live tools

Current foundation tools:

- `record_collected_field`
- `create_request`
- `capture_message`
- `prepare_follow_up`
- `prepare_owner_alert`
- `lookup_current_plan_info`
- `record_unknown_question`
- `simulate_transfer`
- `transfer_call`
- `end_call_with_summary`

Tools are conditionally included. For example, transfer tools are omitted when
no enabled routing rule can transfer. Test and live transfer tools are never
enabled together.

Each tool definition states:

- what it does
- exactly when it may be invoked
- parameter schema
- what success means
- what the agent must do after failure

The manifest is `src/domain/answering-plan/runtime/tools.ts`.

## Coverage validation

The runtime compiler returns IDs for every enabled offering, knowledge item,
request type, intake field, scenario, routing rule, follow-up, and link it
incorporated. The application compares that map with the canonical plan.

A runtime cannot become active if required enabled objects disappeared during
compilation.

## Readiness validation

Compilation warnings are derived from plan readiness. A test runtime may still
run with conservative fallbacks. A live runtime cannot activate while a
blocking requirement remains.

## Owner-side updates during a test

The phone agent and owner-side assistant are separate:

- Gemini Live talks to the pretend caller.
- Gemini Flash Plan Assistant updates the owner’s plan.

When the owner updates information beside a call:

1. Plan Assistant proposes a surgical patch.
2. The application validates and applies it.
3. The plan revision increments.
4. A new runtime compilation is generated.
5. The test UI silently refreshes the Live session or uses current-plan lookup.
6. The user can ask the question again in the same visible experience.

The caller-facing Live agent cannot invoke the Plan Assistant or mutate the
plan.

## Model configuration

All model IDs are environment-configurable. Do not spread preview model IDs
through components or domain logic. Provider adapters own model-specific API
code.

## Official implementation references

- Gemini Live API overview: https://ai.google.dev/gemini-api/docs/live-api
- Live API best practices: https://ai.google.dev/gemini-api/docs/live-api/best-practices
- Live session management: https://ai.google.dev/gemini-api/docs/live-api/session-management
- Function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Structured output: https://ai.google.dev/gemini-api/docs/structured-output
