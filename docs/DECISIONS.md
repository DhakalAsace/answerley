# Product and architecture decisions

## Accepted architectural decisions

- One canonical Answering Plan powers every configuration experience.
- The plan contains both business knowledge and behavior/configuration.
- Current plan data is stored as validated JSONB; operational activity uses
  relational tables.
- Manual and Gemini-assisted plan edits use the same validated patch path.
- Field metadata is separate from values and uses JSON Pointer paths.
- Readiness is calculated from values, modes, dependencies, and metadata—not
  simply from blank fields.
- Published plan versions are immutable; calls retain the version they used.
- Gemini Flash builds the plan, assists the owner, and compiles the Live runtime.
- Gemini Live is caller-facing and cannot change the plan.
- Runtime output is cached per plan revision and validated by schema and
  coverage map.
- The UI and product remain vertical-neutral.
- Request types and intake fields are generic/customizable.
- Test and live calls share operational schemas but use different action states
  and permissions.
- User-visible development is verified through the Plan Lab, Contract Health,
  customer slice, and dashboard.

## Accepted current-flow decisions

- One browser test experience.
- Suggested questions appear beside the phone surface.
- “Update Answerley” sits beside the live test.
- Visible output cards show useful outcomes, not model intent or reasoning.
- Unknown questions create an inline opportunity to add information.
- No separate post-test performance summary.
- Critical review is dynamic and minimal.
- Signup is framed as saving the setup.
- After signup, the user lands on the standard Calls dashboard.
- The test call becomes the first Calls record.
- Payment is associated with connecting and activating real calls.

## Explicitly flexible decisions

- exact onboarding screen count
- login/signup position
- paywall position and trial mechanics
- card layout and section grouping
- landing-page wording and CTA
- model IDs
- exact voice style instructions
- whether a particular edit uses a modal, page, card, tap, text, or speech
- provider selection for telephony, SMS, and calendars

## Deferred decisions

- production phone/SIP provider and media bridge
- detailed pricing tiers
- full Stripe entitlement design
- Google Business Profile acquisition path
- context.dev adapter contract
- production authentication gate location
- direct calendar booking versus request-first default
