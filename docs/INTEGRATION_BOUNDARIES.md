# Integration boundaries

External providers must sit behind product-owned interfaces. UI components and
Answering Plan domain code must not import provider-specific SDKs directly.

## Current provider contracts

| Product capability | Contract |
|---|---|
| Browser and telephone voice | `VoiceGateway` |
| SMS and email delivery | `MessagingProvider` |
| Phone-number provisioning | `NumberProvider` |
| Checkout and billing portal | `BillingProvider` |
| Calendar/direct booking | `BookingProvider` |
| Anonymous pre-signup state | `GuestSessionStore` |
| Gemini runtime compilation | `RuntimeCompiler` |
| Website extraction fallback | `ScrapeFallbackProvider` |

Executable interfaces live in `src/integrations/contracts` and the existing
runtime/scraping modules.

## Why this matters

- browser testing can work before SIP/telephone integration
- test actions can be simulated while live actions use real providers
- model and provider changes do not rewrite dashboard components
- Codex can implement one adapter at a time
- provider failures become visible product states instead of hidden coupling

## Test versus live mode

The same Answering Plan controls both modes.

### Test

- request and message records are marked as test/simulated
- transfers are prepared, not placed
- owner alerts are prepared, not delivered
- output cards show what would happen

### Live

- only enabled, validated tools can execute
- external success is shown only after the provider returns success
- provider IDs and delivery/transfer states are stored in operational records

## Guest-to-account handoff

The anonymous flow uses a server-only guest session containing the imported
plan, metadata, source documents, and test activity. After signup it is claimed
into an authenticated organization, business, Answering Plan, initial plan
version, and test call. The visible customer journey does not restart.
