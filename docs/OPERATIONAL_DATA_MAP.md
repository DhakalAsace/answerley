# Operational data and dashboard map

## Mental model

The Answering Plan is the rulebook. Operational records are the receipts.

The plan answers:

> What should Answerley know and do?

Operational records answer:

> What happened on this particular call, request, message, number, or billing
> period?

## Dashboard mapping

| Dashboard surface | Primary source |
|---|---|
| Calls | calls + call events |
| Call Detail | call + transcript + events + related requests/messages |
| Answering Plan | canonical plan JSONB |
| Today’s Update | plan.temporaryUpdates |
| What You Offer | plan.offerings |
| Hours & Availability | plan.hoursAvailability |
| FAQs & Policies | plan.knowledgeItems |
| Locations & Coverage | plan.locationsCoverage |
| Common Call Scenarios | plan.scenarios |
| Bookings & Intake | plan.booking + requestTypes + intakeFields |
| Routing & Escalation | plan.routing |
| Follow-up & Messages | plan.followUps |
| Spam Screening | plan.spamScreening + spam call records |
| Greeting & Voice | plan.greetingVoice |
| Requests | requests table |
| Messages | messages table |
| Numbers | phone_numbers + provider state |
| Billing | subscriptions + usage events |
| Settings | account, team, business, and integrations |

## Guest sessions

The pre-signup flow has temporary server-only state for the imported plan,
source documents, test activity, and claim token. It is claimed into an
authenticated workspace after signup so the customer never repeats the setup.

## Calls

A call can be a browser test or a live telephone call. It stores:

- business and organization
- immutable plan version and revision
- mode and status
- provider call ID
- caller identity when available
- start/end/duration
- sentiment and urgency
- summary, outcome, resolved state
- whether the owner was notified
- matched scenarios and routing rules
- recording state and audio reference

The Calls feed uses summary fields. Call Detail uses the complete relationships.

## Call events

Call events provide the chronological action stream shown beside a test call
and in Call Detail. Event types include:

- call started and greeting spoken
- question answered
- field collected
- request created
- message captured
- follow-up prepared/sent
- owner alert prepared/sent
- transfer prepared/attempted/connected/failed
- unknown question
- spam blocked
- error and call ended

Each event can reference the plan object or operational record that caused it.

## Transcripts

Transcript turns are separate rows so streaming speech can be appended safely.
Each turn records speaker, text, order, optional timing, and whether it was
interrupted.

## Requests

A request links to:

- business
- originating call when applicable
- immutable plan version
- configured request type
- optional offering
- caller information
- collected custom fields
- status, summary, preferred date/time, and assignees

This supports appointments, reservations, quotes, callbacks, consultations,
service requests, messages, and custom request types without separate tables.

## Messages

Messages include caller messages, caller follow-ups, owner alerts, and system
messages. They record:

- call/request relationship
- configured follow-up rule
- direction and category
- channel
- test/live mode
- captured, prepared, simulated, queued, sent, delivered, or failed status
- recipient
- body
- provider ID and failure detail

## Plan-improvement suggestions

Unknown questions, missing information, source conflicts, and post-call
behavior improvements can become reviewable suggestions linked to the call and
plan version. A suggestion can be open, applied, or dismissed and may carry a
proposed plan patch.

## Audit events

Important user, assistant, system, and integration actions are recorded with
the organization, business, actor, entity, and metadata. Plan changes retain
their dedicated richer history as well.

## Phone numbers

Phone numbers are operational setup, not Answering Plan knowledge. A record can
represent an Answerley number or a forwarded business number, with provider,
status, forwarding mode, and setup verification state.

The plan determines what happens once a call reaches Answerley. The number
record determines how the call reaches Answerley.

## Usage and subscriptions

Usage events record voice seconds, calls, messages, transfers, requests, and
blocked spam. Subscription records represent Stripe customer/subscription
state and entitlements.

Payment gates activation; billing data never belongs inside the Answering Plan.

## Integration connections

Calendar, booking, CRM, telephony, SMS, and future integrations are separate
records. The plan stores a safe connection reference and desired behavior, not
credentials.

## Immutable plan snapshots

When a plan is published, an immutable snapshot is created. Every test or live
call points to the snapshot it used. Later plan edits do not rewrite historical
call behavior.

Example:

- Plan revision 4 allowed a starting price.
- Revision 5 changed pricing to do-not-quote.
- A call made under revision 4 still correctly shows the rule that existed at
  the time.

## Database implementation

The migration is `supabase/migrations/0001_answerley_foundation.sql`. It
includes organizations, users, businesses, server-only guest sessions, current
plans, immutable plan versions, atomic revision RPCs, plan changes, runtime
compilations, source documents, calls, events, transcript turns, requests,
messages, improvement suggestions, audit events, numbers, usage, subscriptions,
integrations, indexes, triggers, and role-aware row-level security policies.
