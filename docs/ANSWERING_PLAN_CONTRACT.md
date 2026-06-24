# Canonical Answering Plan contract

## Purpose

The Answering Plan is the single structured source of truth for what Answerley
knows, says, collects, and does. It powers:

- website-generated setup
- the pre-signup test experience
- manual dashboard editors
- the owner-side Plan Assistant
- live-readiness calculation
- suggested test phrases
- Gemini Live runtime compilation
- future live telephone behavior

There is no separate onboarding plan, dashboard plan, or voice plan.

## Storage model

The current editable Answering Plan is stored as a validated PostgreSQL
`jsonb` document in Supabase. This is appropriate because the plan is nested,
loaded as one configuration, varies in list length, and will evolve while the
product is refined.

Operational activity stays relational. See `OPERATIONAL_DATA_MAP.md`.

Each plan record contains:

- stable plan ID
- business ID
- schema version
- current draft document
- field metadata
- monotonically increasing revision
- current published version reference
- timestamps

Published plan versions are immutable snapshots. A call points to the exact
version and revision it used.

## Top-level structure

```json
{
  "schemaVersion": "1.0.0",
  "businessProfile": {},
  "temporaryUpdates": [],
  "offerings": [],
  "hoursAvailability": {},
  "locationsCoverage": {},
  "knowledgeItems": [],
  "requestTypes": [],
  "intakeFields": [],
  "booking": {},
  "scenarios": [],
  "routing": {
    "contacts": [],
    "teams": [],
    "rules": []
  },
  "followUps": [],
  "unknownHandling": {},
  "spamScreening": {},
  "greetingVoice": {},
  "links": [],
  "globalRules": {}
}
```

The executable schema is `src/domain/answering-plan/schema.ts`.

## Reusable configuration grammar

Most configurable items use the same conceptual grammar:

- stable ID
- enabled/disabled state
- name or title
- description or approved wording
- conditions or scope
- behavior mode
- ordered actions
- references to reusable objects
- fallback behavior
- source and confirmation metadata

This grammar is what makes small future additions safe. A new option normally
extends an existing object instead of creating a new hidden foundation.

## Sections

### Business Profile

Business identity, website, editable business type, description, timezone,
languages, public contact details, address, and pronunciation.

Business type is a defaulting hint, not a vertical lock.

### Temporary Updates

Time-limited information with:

- enabled state
- title
- message
- mention mode
- start and expiry
- automatic removal

### Offerings

Each offering supports:

- enabled state
- name, optional display title, description, and aliases
- whether Answerley may answer questions
- whether the caller may request it
- whether it is bookable
- whether a booking link can be prepared
- pricing behavior and approved wording
- linked request type
- linked intake fields
- locations and links
- additional instructions

Pricing mode determines which price fields are required. `do_not_quote` is a
complete configuration even when numeric prices are empty.

### Hours & Availability

- enabled state
- timezone
- regular weekly hours with split periods
- special dates
- after-hours enabled state and behavior mode
- caller wording
- optional routing rule
- availability notes

### Locations & Coverage

Supports single location, multiple locations, service area, remote, hybrid, or
not applicable. Locations can override hours, offerings, booking, and routing.
Coverage supports cities, postal codes, regions, radius, custom wording, and
exclusions.

### FAQs & Policies

Each knowledge item supports:

- enabled state
- FAQ or policy type
- title
- canonical question
- alternate questions
- approved answer
- behavior: answer, answer and send link, take message, escalate, or do not
  answer
- offering/location scope
- internal notes

Policy examples in mockups are fixtures, not fixed categories.

### Request Types

The Requests dashboard is generic. A business may configure appointments,
reservations, callbacks, quotes, consultations, service requests, messages, or
custom requests.

Each request type has labels, intake fields, completion mode, default
assignees, confirmation wording, and statuses.

### Intake Fields

User-configurable fields support text, long text, phone, email, number, date,
time, choice, yes/no, and address. Each field has:

- enabled state
- stable key and label
- required/optional state
- options and validation guidance
- spoken prompt
- conditional applicability
- order

This is the primary mechanism for broad business support without vertical
schema changes.

### Booking

Booking is optional. Modes include none, send link, collect preferred time,
connected calendar, direct booking, and request only. Conditional requirements
ensure a booking link or integration is required only when the selected mode
needs it.

### Common Call Scenarios

A scenario expresses:

> When this applies → ordered actions → collect → create request → notify →
> fallback → caller wording.

Supported action primitives are approved answer, clarify, collect information,
create request, take message, send link, prepare follow-up, notify, transfer,
use fallback, and end interaction.

### Routing & Escalation

Reusable contacts and teams are separate from routing rules. A rule supports:

- enabled state
- scenario/request/location/time conditions
- business-hours action
- after-hours action
- transfer sequence and wait time
- unanswered action
- notification recipients
- caller wording

A transfer recipient’s phone is required only when an enabled rule actually
uses transfer.

### Follow-up & Messages

Trigger-based rules support:

- enabled state
- caller follow-up, owner alert, or internal message
- channel
- recipient type and references
- message template
- optional reusable link
- owner notification
- sending window

Test mode creates `prepared` or `simulated` records. Live mode can create
queued, sent, delivered, or failed records.

### Unknown Handling

The universal fallback includes clarification behavior, default action,
collection fields, caller wording, notification/routing, and whether to create
an improvement suggestion. This keeps a test useful when the website did not
contain an answer.

### Spam Screening

Enabled state, likely-robocall blocking, feed visibility, usage behavior,
unknown-local-number handling, and suspected-spam action.

### Greeting & Voice

Enabled state, greeting, assistant name, model voice ID, tone, language,
pronunciation, closing wording, and preview text.

### Links

Reusable approved URLs for booking, contact, pricing, offerings, FAQs,
policies, locations, payments, or custom use. Other plan sections reference
link IDs rather than copying URLs.

### Global Rules

Cross-cutting behavior such as approved-knowledge-only, no invented business
facts, one-question-at-a-time intake, no repeated collection, request
confirmation, pricing default, and conversation style.

## Source metadata

Field metadata is stored beside the plan rather than wrapping every value. It
uses JSON Pointer paths and can record:

- source type
- source document and URL
- excerpt
- confidence
- user confirmation
- last change source and time
- conflicting candidate values
- notes

Visible labels such as Found on website, Recommended, Added by you, Confirmed,
Needs confirmation, Missing, Conflict, and Not applicable are derived from the
value, metadata, current mode, and requirement rules.

## Conditional readiness

Empty does not automatically mean incomplete.

Examples:

- pricing mode `do_not_quote` + no numeric price = complete
- booking disabled + no booking link = complete
- booking enabled in `send_link` mode + no link = incomplete
- transfer enabled + no reachable recipient = incomplete
- remote coverage + no local service area = complete

The readiness calculator is `src/domain/answering-plan/readiness.ts`.

## Shared write path

Manual edits and Plan Assistant edits both produce RFC 6902 patch operations:

```text
propose → check base revision → validate patch → apply to copy → validate whole
plan → increment revision → update metadata → record audit/change → invalidate
runtime compilation
```

The implementation is `src/domain/answering-plan/patches.ts`.

Patch guardrails reject whole-document replacement, removal of required
sections, excessive operation counts, and cross-section move/copy operations.
After schema validation, `src/domain/answering-plan/integrity.ts` checks stable
ID uniqueness, price ranges, and every cross-section reference. A plan may be
incomplete, but it may not be internally broken.

The model must never regenerate the entire plan for a surgical update.

## Versioning and migration

- Every plan has a schema version and revision.
- Additive schema changes receive defaults.
- Structural changes require a migration.
- Stable IDs are used for list items and cross-references.
- Existing snapshots remain readable.
- Every call records the immutable plan version and revision it used.
