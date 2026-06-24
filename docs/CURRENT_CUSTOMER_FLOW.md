# Current customer flow

This document records the current direction. It is intentionally easier to
change than the canonical data contract.

## Current v1 sequence

```text
Landing-page business input
→ build assistant
→ one browser test
→ minimal live-critical review when needed
→ save setup / account gate
→ standard Calls dashboard
→ connect phone
→ pricing
→ activate
```

## Landing

The landing page may change its framing based on the page the visitor entered
from, but it uses one product flow. The core input accepts a website or
business name.

Login/signup placement is a movable gate and is not an architectural
invariant.

## Build state

Visible progress communicates that Answerley is finding offerings, hours,
locations, FAQs/policies, links, and common call handling. Cheerio is primary;
a context.dev adapter can be added as a fallback. Gemini Flash converts the
extracted documents into the canonical plan.

## One test experience

There is no guided/free mode choice and no separate test suite.

The test page has:

- browser phone/voice surface
- live transcript
- business-specific “Try saying” examples
- owner-side “Update Answerley” text/voice input
- “During this call” outcome cards

The UI displays outputs, not model internals. It should not show intent scores,
confidence, reasoning, or tool names.

Possible visible outcomes:

- contact details collected
- request captured
- message captured
- follow-up prepared
- owner alert prepared
- transfer prepared

## Unknown answer behavior

If the caller asks something the plan does not know, the Live agent uses the
configured fallback. At the same time, the owner-side UI offers a direct field
to add the answer. The owner does not need to pause the test or enter a
separate teaching mode.

After the update is applied, the user can ask again in the same visible test
experience.

## End of test

There is no separate performance-report page. The outcome stream and transcript
already show what happened. Ending the call enables Continue.

The test call is saved and later appears as the first record in the standard
Calls dashboard with a Test badge.

## Critical review

The next page appears only when live-critical requirements are unresolved. It
shows the minimum dynamic questions calculated by readiness rules. Optional
empty fields stay in the dashboard.

## Save setup

Signup is framed as preserving the setup:

> Save your Answerley setup

Google and passwordless email are intended. The business, plan, corrections,
and test call must survive account creation.

## Standard dashboard

After signup, users land on Calls. The existing navigation remains stable:

- Calls
- Answering Plan
- Requests
- Messages
- Spam
- Numbers
- Billing
- Settings

A slim setup banner may invite the user to Connect your phone or Review
Answering Plan. Test another call belongs in Answering Plan.

## Activation and payment

The user first learns how calls reach Answerley:

- keep current number through forwarding
- use an Answerley number
- get setup help

Then they may choose overflow, after-hours, or all calls. Pricing and Stripe
appear when the user intends to activate real calls.

Current commercial rule:

> Free to build, test, save, and inspect. Paid to activate real calls.
