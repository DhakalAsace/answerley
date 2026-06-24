import type { AnsweringPlanDocument } from "./schema";

export type PlanSectionId =
  | "businessProfile"
  | "temporaryUpdates"
  | "offerings"
  | "hoursAvailability"
  | "locationsCoverage"
  | "knowledgeItems"
  | "requestsIntake"
  | "booking"
  | "scenarios"
  | "routing"
  | "followUps"
  | "unknownHandling"
  | "spamScreening"
  | "greetingVoice"
  | "links"
  | "globalRules";

export type FieldKind =
  | "text"
  | "long_text"
  | "boolean"
  | "mode"
  | "list"
  | "object"
  | "number"
  | "url"
  | "time"
  | "reference";

export interface PlanSectionDefinition {
  id: PlanSectionId;
  label: string;
  description: string;
  planPaths: string[];
  dashboardSurface: string;
  runtimeLayer: string;
  icon: string;
}

export interface FieldDefinition {
  id: string;
  pathPattern: string;
  section: PlanSectionId;
  label: string;
  description: string;
  kind: FieldKind;
  supportsEnabledState?: boolean;
  extractable: boolean;
  assistantCanRecommend: boolean;
  assistantCanEdit: boolean;
  userCanEdit: boolean;
  affectsLiveRuntime: boolean;
  highImpact?: boolean;
  requirementSummary?: string;
}

export const planSections: PlanSectionDefinition[] = [
  {
    id: "businessProfile",
    label: "Business Profile",
    description: "Identity, description, contact information, language, timezone, and pronunciation.",
    planPaths: ["/businessProfile"],
    dashboardSurface: "Settings / Confirm Basics",
    runtimeLayer: "identity + business context",
    icon: "building",
  },
  {
    id: "temporaryUpdates",
    label: "Today’s Update",
    description: "Time-limited information that should be mentioned only under configured conditions.",
    planPaths: ["/temporaryUpdates"],
    dashboardSurface: "Answering Plan / Today’s Update",
    runtimeLayer: "temporary context",
    icon: "calendar-clock",
  },
  {
    id: "offerings",
    label: "What You Offer",
    description: "Offerings, descriptions, aliases, requestability, booking, and pricing behavior.",
    planPaths: ["/offerings"],
    dashboardSurface: "Answering Plan / What You Offer",
    runtimeLayer: "approved knowledge + request behavior",
    icon: "briefcase",
  },
  {
    id: "hoursAvailability",
    label: "Hours & Availability",
    description: "Regular hours, special dates, timezone, and after-hours behavior.",
    planPaths: ["/hoursAvailability"],
    dashboardSurface: "Answering Plan / Hours & Availability",
    runtimeLayer: "time-aware behavior",
    icon: "clock",
  },
  {
    id: "locationsCoverage",
    label: "Locations & Coverage",
    description: "Locations, service areas, remote availability, and caller-facing coverage wording.",
    planPaths: ["/locationsCoverage"],
    dashboardSurface: "Answering Plan / Locations & Coverage",
    runtimeLayer: "approved knowledge + routing scope",
    icon: "map-pin",
  },
  {
    id: "knowledgeItems",
    label: "FAQs & Policies",
    description: "Approved questions, answers, alternate wording, links, and permitted behavior.",
    planPaths: ["/knowledgeItems"],
    dashboardSurface: "Answering Plan / FAQs & Policies",
    runtimeLayer: "approved knowledge",
    icon: "book-open",
  },
  {
    id: "requestsIntake",
    label: "Requests & Intake",
    description: "Generic request types and the configurable information Answerley collects.",
    planPaths: ["/requestTypes", "/intakeFields"],
    dashboardSurface: "Answering Plan / Bookings & Intake; Requests",
    runtimeLayer: "collection + request creation",
    icon: "clipboard-list",
  },
  {
    id: "booking",
    label: "Booking",
    description: "Booking mode, links, integrations, confirmation wording, and per-offering overrides.",
    planPaths: ["/booking"],
    dashboardSurface: "Answering Plan / Bookings & Intake",
    runtimeLayer: "booking workflow",
    icon: "calendar-check",
  },
  {
    id: "scenarios",
    label: "Common Call Scenarios",
    description: "When a caller situation applies, what to do, what to collect, and how to fall back.",
    planPaths: ["/scenarios"],
    dashboardSurface: "Answering Plan / Common Call Scenarios",
    runtimeLayer: "conversation flows + tools",
    icon: "git-branch",
  },
  {
    id: "routing",
    label: "Routing & Escalation",
    description: "Contacts, teams, transfer sequences, notifications, and unanswered behavior.",
    planPaths: ["/routing"],
    dashboardSurface: "Answering Plan / Routing & Escalation",
    runtimeLayer: "routing tools + guardrails",
    icon: "route",
  },
  {
    id: "followUps",
    label: "Follow-up & Messages",
    description: "Caller follow-ups, owner alerts, trigger rules, sending windows, and templates.",
    planPaths: ["/followUps"],
    dashboardSurface: "Answering Plan / Follow-up & Messages; Messages",
    runtimeLayer: "message tools",
    icon: "message-square",
  },
  {
    id: "unknownHandling",
    label: "Unknown Handling",
    description: "What happens when the plan does not contain a confirmed answer.",
    planPaths: ["/unknownHandling"],
    dashboardSurface: "Answering Plan / implicit safety setting",
    runtimeLayer: "grounding + fallback",
    icon: "circle-help",
  },
  {
    id: "spamScreening",
    label: "Spam Screening",
    description: "Robocall blocking, spam visibility, usage handling, and screening mode.",
    planPaths: ["/spamScreening"],
    dashboardSurface: "Answering Plan / Spam Screening; Spam",
    runtimeLayer: "pre-call screening",
    icon: "shield",
  },
  {
    id: "greetingVoice",
    label: "Greeting & Voice",
    description: "Greeting, assistant name, voice, tone, language, pronunciation, and closing wording.",
    planPaths: ["/greetingVoice"],
    dashboardSurface: "Answering Plan / Greeting & Voice",
    runtimeLayer: "persona + speaking style",
    icon: "audio-waveform",
  },
  {
    id: "links",
    label: "Links",
    description: "Reusable booking, contact, pricing, offering, FAQ, and policy URLs.",
    planPaths: ["/links"],
    dashboardSurface: "Used by offerings, knowledge, booking, and follow-ups",
    runtimeLayer: "tool payloads + approved references",
    icon: "link",
  },
  {
    id: "globalRules",
    label: "Global Rules",
    description: "Cross-cutting behavior such as approved-only knowledge and one-question-at-a-time intake.",
    planPaths: ["/globalRules"],
    dashboardSurface: "Advanced Answering Plan settings",
    runtimeLayer: "global guardrails",
    icon: "sliders-horizontal",
  },
];

export const fieldRegistry: FieldDefinition[] = [
  { id: "business.name", pathPattern: "/businessProfile/businessName", section: "businessProfile", label: "Business name", description: "Public business name used in greetings and answers.", kind: "text", extractable: true, assistantCanRecommend: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, requirementSummary: "Always required before live calls." },
  { id: "business.type", pathPattern: "/businessProfile/businessType", section: "businessProfile", label: "Business type", description: "Editable category used for useful defaults, not rigid vertical logic.", kind: "object", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "business.description", pathPattern: "/businessProfile/description", section: "businessProfile", label: "Business description", description: "Concise approved description of what the business does.", kind: "long_text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "business.timezone", pathPattern: "/businessProfile/timezone", section: "businessProfile", label: "Timezone", description: "Controls hours, temporary updates, routing, and sending windows.", kind: "mode", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, requirementSummary: "Required whenever time-aware behavior is enabled." },
  { id: "business.publicPhone", pathPattern: "/businessProfile/publicContact/phone", section: "businessProfile", label: "Public phone", description: "Approved public contact phone found on the website or supplied by the user.", kind: "text", extractable: true, assistantCanRecommend: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "business.publicEmail", pathPattern: "/businessProfile/publicContact/email", section: "businessProfile", label: "Public email", description: "Approved public contact email.", kind: "text", extractable: true, assistantCanRecommend: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "temporary.enabled", pathPattern: "/temporaryUpdates/*/enabled", section: "temporaryUpdates", label: "Update enabled", description: "Turns a temporary update on or off without deleting it.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "temporary.message", pathPattern: "/temporaryUpdates/*/message", section: "temporaryUpdates", label: "Temporary message", description: "What Answerley should know or mention for a limited period.", kind: "long_text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.enabled", pathPattern: "/offerings/*/enabled", section: "offerings", label: "Offering enabled", description: "Makes an offering available to callers without deleting it.", kind: "boolean", supportsEnabledState: true, extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.name", pathPattern: "/offerings/*/name", section: "offerings", label: "Offering name", description: "Caller-facing offering or service name.", kind: "text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.description", pathPattern: "/offerings/*/description", section: "offerings", label: "Offering description", description: "Approved explanation of the offering.", kind: "long_text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.answerQuestions", pathPattern: "/offerings/*/canAnswerQuestions", section: "offerings", label: "Answer questions", description: "Allows or prevents Answerley from answering questions about this offering.", kind: "boolean", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.requestable", pathPattern: "/offerings/*/requestable", section: "offerings", label: "Requestable", description: "Controls whether a caller can create a request for this offering.", kind: "boolean", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.bookable", pathPattern: "/offerings/*/bookable", section: "offerings", label: "Bookable", description: "Controls whether booking behavior is available for this offering.", kind: "boolean", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "offerings.pricingMode", pathPattern: "/offerings/*/pricing/mode", section: "offerings", label: "Pricing behavior", description: "Whether Answerley quotes no price, a starting price, range, fixed price, or approved wording.", kind: "mode", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "hours.enabled", pathPattern: "/hoursAvailability/enabled", section: "hoursAvailability", label: "Hours enabled", description: "Controls whether hours are part of caller-facing knowledge.", kind: "boolean", supportsEnabledState: true, extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "hours.regular", pathPattern: "/hoursAvailability/regularHours", section: "hoursAvailability", label: "Regular hours", description: "Open and closed periods for each day.", kind: "object", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "hours.special", pathPattern: "/hoursAvailability/specialDates", section: "hoursAvailability", label: "Special dates", description: "Holiday and date-specific hours or closures.", kind: "list", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "hours.afterHours", pathPattern: "/hoursAvailability/afterHours", section: "hoursAvailability", label: "After-hours behavior", description: "Controls what Answerley does outside regular hours.", kind: "object", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "coverage.mode", pathPattern: "/locationsCoverage/mode", section: "locationsCoverage", label: "Coverage mode", description: "Single location, multiple locations, service area, remote, hybrid, or not applicable.", kind: "mode", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "coverage.locations", pathPattern: "/locationsCoverage/locations", section: "locationsCoverage", label: "Locations", description: "Configurable business locations with optional overrides.", kind: "list", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "coverage.serviceAreas", pathPattern: "/locationsCoverage/serviceAreas", section: "locationsCoverage", label: "Service areas", description: "Cities, regions, postal codes, radius, exclusions, or custom coverage wording.", kind: "list", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "knowledge.enabled", pathPattern: "/knowledgeItems/*/enabled", section: "knowledgeItems", label: "Knowledge item enabled", description: "Turns a FAQ or policy on or off without deleting it.", kind: "boolean", supportsEnabledState: true, extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "knowledge.question", pathPattern: "/knowledgeItems/*/question", section: "knowledgeItems", label: "Question", description: "Primary caller wording for the FAQ or policy.", kind: "text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "knowledge.answer", pathPattern: "/knowledgeItems/*/answer", section: "knowledgeItems", label: "Approved answer", description: "The answer Answerley is permitted to give.", kind: "long_text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "knowledge.behavior", pathPattern: "/knowledgeItems/*/behavior/mode", section: "knowledgeItems", label: "Knowledge behavior", description: "Answer, answer and send link, take message, escalate, or do not answer.", kind: "mode", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "requestTypes.enabled", pathPattern: "/requestTypes/*/enabled", section: "requestsIntake", label: "Request type enabled", description: "Makes a generic request type available to callers and the Requests dashboard.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "requestTypes.name", pathPattern: "/requestTypes/*/name", section: "requestsIntake", label: "Request type", description: "Appointment, callback, quote, consultation, reservation, service request, or custom request.", kind: "text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "intake.enabled", pathPattern: "/intakeFields/*/enabled", section: "requestsIntake", label: "Intake field enabled", description: "Turns a caller question on or off without deleting its configuration.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "intake.field", pathPattern: "/intakeFields/*", section: "requestsIntake", label: "Custom intake field", description: "Label, type, requirement, conditions, validation, spoken prompt, and order.", kind: "object", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "booking.enabled", pathPattern: "/booking/enabled", section: "booking", label: "Booking enabled", description: "Turns booking handling on or off.", kind: "boolean", supportsEnabledState: true, extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "booking.method", pathPattern: "/booking/defaultMethod", section: "booking", label: "Booking method", description: "Send link, collect preferred time, connected calendar, direct booking, request only, or none.", kind: "mode", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "booking.link", pathPattern: "/booking/bookingLinkId", section: "booking", label: "Booking link", description: "Required when booking uses a link.", kind: "reference", extractable: true, assistantCanRecommend: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, requirementSummary: "Required only when booking method is send link." },
  { id: "scenarios.enabled", pathPattern: "/scenarios/*/enabled", section: "scenarios", label: "Scenario enabled", description: "Activates or pauses a call-handling scenario.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "scenarios.condition", pathPattern: "/scenarios/*/whenCaller", section: "scenarios", label: "When caller", description: "Natural-language condition describing when the scenario applies.", kind: "long_text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "scenarios.actions", pathPattern: "/scenarios/*/actions", section: "scenarios", label: "Scenario actions", description: "Ordered actions: answer, clarify, collect, request, message, link, notify, transfer, fallback, or end.", kind: "list", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "routing.enabled", pathPattern: "/routing/enabled", section: "routing", label: "Routing enabled", description: "Turns routing and escalation behavior on or off.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "routing.contacts", pathPattern: "/routing/contacts", section: "routing", label: "People and teams", description: "Contacts, teams, phone/email details, and notification preferences.", kind: "list", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "routing.rules", pathPattern: "/routing/rules", section: "routing", label: "Routing rules", description: "Time-aware transfers, notifications, wait duration, fallback, and caller wording.", kind: "list", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "followups.enabled", pathPattern: "/followUps/*/enabled", section: "followUps", label: "Message rule enabled", description: "Turns a follow-up or alert rule on or off.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "followups.trigger", pathPattern: "/followUps/*/trigger", section: "followUps", label: "Message trigger", description: "When a caller follow-up or owner alert should be prepared or sent.", kind: "mode", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "followups.text", pathPattern: "/followUps/*/messageText", section: "followUps", label: "Message text", description: "Editable caller or team message template.", kind: "long_text", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "unknown.enabled", pathPattern: "/unknownHandling/enabled", section: "unknownHandling", label: "Unknown handling enabled", description: "Enables a safe fallback for unconfirmed questions.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "unknown.action", pathPattern: "/unknownHandling/defaultAction", section: "unknownHandling", label: "Unknown default action", description: "Take message, create request, notify, transfer, or custom handling.", kind: "mode", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "unknown.wording", pathPattern: "/unknownHandling/callerWording", section: "unknownHandling", label: "Unknown-answer wording", description: "What callers hear when confirmed information is unavailable.", kind: "long_text", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "spam.enabled", pathPattern: "/spamScreening/enabled", section: "spamScreening", label: "Spam screening enabled", description: "Turns all spam-screening behavior on or off.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "spam.blockRobocalls", pathPattern: "/spamScreening/blockLikelyRobocalls", section: "spamScreening", label: "Block likely robocalls", description: "Controls likely robocall blocking.", kind: "boolean", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "voice.enabled", pathPattern: "/greetingVoice/enabled", section: "greetingVoice", label: "Greeting and voice enabled", description: "Controls caller-facing voice configuration.", kind: "boolean", supportsEnabledState: true, extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "voice.greeting", pathPattern: "/greetingVoice/openingGreeting", section: "greetingVoice", label: "Opening greeting", description: "The first caller-facing message.", kind: "long_text", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, requirementSummary: "Required when greeting and voice are enabled." },
  { id: "voice.voiceId", pathPattern: "/greetingVoice/voiceId", section: "greetingVoice", label: "Voice", description: "Configurable Gemini Live voice identifier.", kind: "mode", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "voice.tone", pathPattern: "/greetingVoice/tone", section: "greetingVoice", label: "Tone", description: "Warm, professional, calm, direct, mature, or custom voice behavior.", kind: "mode", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "links.resource", pathPattern: "/links/*", section: "links", label: "Reusable link", description: "Approved URL referenced by booking, offerings, knowledge, and messages.", kind: "url", extractable: true, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "global.approvedOnly", pathPattern: "/globalRules/approvedKnowledgeOnly", section: "globalRules", label: "Approved knowledge only", description: "Prevents unapproved business facts from being used in calls.", kind: "boolean", extractable: false, assistantCanRecommend: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "global.oneAtATime", pathPattern: "/globalRules/askOneQuestionAtATime", section: "globalRules", label: "Ask one question at a time", description: "Keeps phone intake natural and easy to follow.", kind: "boolean", extractable: false, assistantCanRecommend: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
];

export function getSectionDefinition(id: PlanSectionId) {
  return planSections.find((section) => section.id === id);
}

export function fieldsForSection(id: PlanSectionId) {
  return fieldRegistry.filter((field) => field.section === id);
}

export function summarizePlanCounts(plan: AnsweringPlanDocument) {
  return {
    offerings: plan.offerings.filter((item) => item.enabled).length,
    knowledgeItems: plan.knowledgeItems.filter((item) => item.enabled).length,
    requestTypes: plan.requestTypes.filter((item) => item.enabled).length,
    intakeFields: plan.intakeFields.filter((item) => item.enabled).length,
    scenarios: plan.scenarios.filter((item) => item.enabled).length,
    routingRules: plan.routing.rules.filter((item) => item.enabled).length,
    followUps: plan.followUps.filter((item) => item.enabled).length,
  };
}
