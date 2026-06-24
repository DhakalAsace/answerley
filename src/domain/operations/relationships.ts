export const operationalRelationships = [
  {
    entity: "Call",
    purpose: "One browser test or real telephone conversation.",
    connectsTo: ["Business", "Answering Plan Version", "Transcript", "Call Events", "Requests", "Messages", "Usage"],
  },
  {
    entity: "Call Event",
    purpose: "A chronological record of visible actions and outcomes during a call.",
    connectsTo: ["Call", "Request", "Message", "Routing Rule", "Follow-up Rule"],
  },
  {
    entity: "Request",
    purpose: "A caller-created appointment, callback, quote, consultation, reservation, service request, or custom request.",
    connectsTo: ["Business", "Call", "Answering Plan Version", "Request Type", "Offering"],
  },
  {
    entity: "Message",
    purpose: "A captured caller message, caller follow-up, owner alert, or system message.",
    connectsTo: ["Business", "Call", "Request", "Answering Plan Version", "Follow-up Rule"],
  },
  {
    entity: "Plan Improvement Suggestion",
    purpose: "A reviewable improvement raised from an unknown question, missing information, conflict, or call outcome.",
    connectsTo: ["Business", "Call", "Answering Plan Version", "Proposed Plan Patch"],
  },
  {
    entity: "Audit Event",
    purpose: "A durable record of important user, assistant, system, and integration actions.",
    connectsTo: ["Organization", "Business", "User", "Entity"],
  },
  {
    entity: "Guest Session",
    purpose: "Temporary pre-signup business import, Answering Plan, and browser-test state that can be claimed after authentication.",
    connectsTo: ["Guest token", "Source documents", "Answering Plan", "Test activity", "Authenticated workspace"],
  },
  {
    entity: "Phone Number",
    purpose: "A provisioned Answerley number or a business number forwarded to Answerley.",
    connectsTo: ["Business", "Telephony provider"],
  },
  {
    entity: "Subscription",
    purpose: "The organization’s paid activation and entitlement state.",
    connectsTo: ["Organization", "Stripe customer", "Stripe subscription"],
  },
  {
    entity: "Usage Event",
    purpose: "Metered activity used by Billing and cost analysis.",
    connectsTo: ["Organization", "Business", "Call"],
  },
] as const;
