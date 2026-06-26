# Small Business Answering transporter assistant scope

The bottom-right dashboard assistant is the owner-side bridge between the user
and the saved answering setup.

## It can help directly

- answer questions about what callers will hear or what the setup currently does
- propose and apply reviewed updates to Answering Setup
- update future-call behavior: services, approved answers, hours, after-hours,
  appointment handling, request fields, owner alerts, caller confirmations,
  urgent routing, spam screening, greeting, privacy, and safety handling
- explain current calls, requests, appointments, and prepared messages from the
  workspace
- send the user to Calls, Requests, Appointments, Test Center, Phone Setup,
  Billing, Settings, or Answering Setup

## It should not directly mutate yet

- captured call records
- captured request or appointment status
- prepared message delivery state
- phone number provisioning or forwarding
- billing, invoices, payment methods, or subscriptions
- account/team/authentication settings

Those are operational records or postponed integrations. Until the dedicated
authenticated workflows exist, the assistant explains them and opens the right
screen instead of changing them from chat.

## Mutation rule

Setup edits go through the same safe path as manual edits:

1. owner asks in natural language
2. Gemini returns a small setup patch or a clarification
3. the app validates the patch against the current draft
4. the user reviews and applies it
5. the workspace saves the new setup draft
6. dashboard surfaces refresh from the saved workspace
