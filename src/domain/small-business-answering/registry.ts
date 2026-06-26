import type { AnsweringSetup } from "./schema";
import type { SetupGateStatus } from "./readiness";

export type SetupSectionId =
  | "business"
  | "services_answers"
  | "hours_after_hours"
  | "appointment_handling"
  | "call_handling"
  | "greeting_voice"
  | "owner_alerts"
  | "safety_unknown"
  | "sources_activation";

export type SetupFieldKind =
  | "text"
  | "long_text"
  | "boolean"
  | "mode"
  | "list"
  | "object"
  | "number"
  | "url"
  | "time";

export interface SetupSectionDefinition {
  id: SetupSectionId;
  label: string;
  description: string;
  setupPaths: string[];
  gateIds: string[];
  dashboardSurface: string;
  runtimeLayer: string;
  icon: string;
}

export interface SetupFieldDefinition {
  id: string;
  pathPattern: string;
  section: SetupSectionId;
  label: string;
  description: string;
  kind: SetupFieldKind;
  extractable: boolean;
  assistantCanEdit: boolean;
  userCanEdit: boolean;
  affectsLiveRuntime: boolean;
  highImpact?: boolean;
  requirementSummary?: string;
}

export const topLevelSetupPaths = [
  "schemaVersion",
  "setupId",
  "businessId",
  "brand",
  "status",
  "business",
  "services",
  "approvedAnswers",
  "hours",
  "callHandling",
  "requestCapture",
  "appointmentHandling",
  "urgentRouting",
  "ownerAlerts",
  "callerConfirmations",
  "spamScreening",
  "privacy",
  "sources",
  "activationGates",
] as const;

export const setupSections: SetupSectionDefinition[] = [
  {
    id: "business",
    label: "Business details",
    description: "Name, website, public contact details, address, timezone, language, and service area.",
    setupPaths: ["/schemaVersion", "/setupId", "/businessId", "/brand", "/status", "/business"],
    gateIds: ["business_details"],
    dashboardSurface: "Answering Setup / Business details",
    runtimeLayer: "identity + business context",
    icon: "building",
  },
  {
    id: "services_answers",
    label: "Services and approved answers",
    description: "Services callers can ask about, safe pricing wording, and approved FAQ/policy answers.",
    setupPaths: ["/services", "/approvedAnswers"],
    gateIds: ["services_answers"],
    dashboardSurface: "Answering Setup / Services and answers",
    runtimeLayer: "approved knowledge",
    icon: "sparkles",
  },
  {
    id: "hours_after_hours",
    label: "Hours and after-hours",
    description: "Open hours, temporary updates, after-hours wording, and urgent after-hours behavior.",
    setupPaths: ["/hours"],
    gateIds: ["hours_after_hours"],
    dashboardSurface: "Answering Setup / Hours and after-hours",
    runtimeLayer: "time-aware behavior",
    icon: "clock",
  },
  {
    id: "appointment_handling",
    label: "Appointment handling",
    description: "Request capture fields, booking links, calendar state, and caller confirmation rules.",
    setupPaths: ["/requestCapture", "/appointmentHandling", "/callerConfirmations"],
    gateIds: [],
    dashboardSurface: "Appointments / Answering Setup",
    runtimeLayer: "request capture + booking",
    icon: "calendar-check",
  },
  {
    id: "call_handling",
    label: "Call handling",
    description: "Answer mode, answer timing, caller greeting, spam screening, and urgent routing.",
    setupPaths: ["/callHandling", "/urgentRouting", "/spamScreening"],
    gateIds: ["phone_routing"],
    dashboardSurface: "Phone Setup / Test Center",
    runtimeLayer: "conversation flow + routing",
    icon: "phone-call",
  },
  {
    id: "greeting_voice",
    label: "Greeting and voice",
    description: "Opening greeting, tone, language, and caller disclosure wording.",
    setupPaths: ["/callHandling/callerGreeting", "/privacy"],
    gateIds: ["greeting_voice"],
    dashboardSurface: "Answering Setup / Greeting and voice",
    runtimeLayer: "caller-facing persona",
    icon: "volume",
  },
  {
    id: "owner_alerts",
    label: "Owner alerts",
    description: "Owner, office, on-call, and backup contacts plus message templates.",
    setupPaths: ["/ownerAlerts", "/urgentRouting/alertContactIds"],
    gateIds: ["owner_alerts"],
    dashboardSurface: "Answering Setup / Owner alerts",
    runtimeLayer: "owner notification tools",
    icon: "bell",
  },
  {
    id: "safety_unknown",
    label: "Safety and unknown questions",
    description: "Approved-answer-only behavior, unknown-question fallback, spam handling, recording, and retention.",
    setupPaths: ["/callHandling/unknownAnswerBehavior", "/spamScreening", "/privacy"],
    gateIds: [],
    dashboardSurface: "Answering Setup / Safety",
    runtimeLayer: "grounding + privacy guardrails",
    icon: "shield",
  },
  {
    id: "sources_activation",
    label: "Sources and activation",
    description: "Website evidence, owner edits, activation gates, billing, phone routing, and final approval.",
    setupPaths: ["/sources", "/activationGates"],
    gateIds: ["billing", "final_test"],
    dashboardSurface: "Overview / Answering Setup",
    runtimeLayer: "audit + publish gates",
    icon: "file-search",
  },
];

export const fieldRegistry: SetupFieldDefinition[] = [
  { id: "business.name", pathPattern: "/business/name", section: "business", label: "Business name", description: "Caller-facing business name used in greetings and answers.", kind: "text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, requirementSummary: "Required before live calls." },
  { id: "business.website", pathPattern: "/business/websiteUrl", section: "business", label: "Website", description: "Website used to build and source the setup.", kind: "url", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "business.phone", pathPattern: "/business/publicPhone", section: "business", label: "Public phone", description: "Business phone callers may know; not automatically an owner alert recipient.", kind: "text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "business.email", pathPattern: "/business/publicEmail", section: "business", label: "Public email", description: "Public email found on the website or supplied by the owner.", kind: "text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "business.timezone", pathPattern: "/business/timezone", section: "business", label: "Timezone", description: "Controls hours, after-hours behavior, and alert timing.", kind: "mode", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "business.serviceArea", pathPattern: "/business/serviceArea", section: "business", label: "Service area", description: "Caller-facing area where the business serves customers.", kind: "object", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "services.name", pathPattern: "/services/*/name", section: "services_answers", label: "Service name", description: "Caller-facing service name.", kind: "text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "services.description", pathPattern: "/services/*/approvedDescription", section: "services_answers", label: "Approved service description", description: "What the setup may say about the service.", kind: "long_text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "services.pricing", pathPattern: "/services/*/pricingWording", section: "services_answers", label: "Pricing wording", description: "Safe pricing text or null when pricing should not be quoted.", kind: "long_text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "answers.question", pathPattern: "/approvedAnswers/*/question", section: "services_answers", label: "Approved question", description: "Question the setup may answer.", kind: "text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "answers.answer", pathPattern: "/approvedAnswers/*/answer", section: "services_answers", label: "Approved answer", description: "Exact business answer allowed in calls.", kind: "long_text", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "hours.regular", pathPattern: "/hours/regular", section: "hours_after_hours", label: "Regular hours", description: "Open and closed periods for each day.", kind: "object", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "hours.afterHours", pathPattern: "/hours/afterHours", section: "hours_after_hours", label: "After-hours behavior", description: "What callers hear and what happens after the business is closed.", kind: "object", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "request.fields", pathPattern: "/requestCapture/fields", section: "appointment_handling", label: "Captured fields", description: "Caller details collected for requests and messages.", kind: "list", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "appointment.mode", pathPattern: "/appointmentHandling/mode", section: "appointment_handling", label: "Appointment mode", description: "Capture request, send booking link, or connected calendar booking.", kind: "mode", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "appointment.link", pathPattern: "/appointmentHandling/bookingLinkUrl", section: "appointment_handling", label: "Booking link", description: "Booking URL sent only when configured.", kind: "url", extractable: true, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "call.mode", pathPattern: "/callHandling/mode", section: "call_handling", label: "Answer mode", description: "Owner-first, overflow, after-hours, immediate, urgent-only, or paused.", kind: "mode", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "call.timing", pathPattern: "/callHandling/answerTiming", section: "call_handling", label: "Answer timing", description: "Ring delay and when the service should answer.", kind: "object", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "call.greeting", pathPattern: "/callHandling/callerGreeting", section: "greeting_voice", label: "Caller greeting", description: "First sentence callers hear.", kind: "long_text", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, requirementSummary: "Required before live calls." },
  { id: "urgent.routing", pathPattern: "/urgentRouting", section: "call_handling", label: "Urgent routing", description: "Emergency phrases, detail collection, alert contacts, and transfer behavior.", kind: "object", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "owner.contacts", pathPattern: "/ownerAlerts/contacts", section: "owner_alerts", label: "Owner alert contacts", description: "Owner, office, on-call, and backup recipients.", kind: "list", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true, requirementSummary: "At least one enabled contact channel is required before live calls." },
  { id: "owner.template", pathPattern: "/ownerAlerts/messageTemplate", section: "owner_alerts", label: "Owner alert template", description: "Summary text sent to the business.", kind: "long_text", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "unknown.behavior", pathPattern: "/callHandling/unknownAnswerBehavior", section: "safety_unknown", label: "Unknown answer behavior", description: "Safe fallback when approved information is missing.", kind: "mode", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "spam.enabled", pathPattern: "/spamScreening/enabled", section: "safety_unknown", label: "Spam screening", description: "Whether likely spam is screened and separated from normal calls.", kind: "boolean", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true },
  { id: "privacy.recording", pathPattern: "/privacy/callRecording", section: "safety_unknown", label: "Call recording", description: "Recording mode and caller disclosure.", kind: "mode", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
  { id: "sources.website", pathPattern: "/sources", section: "sources_activation", label: "Sources", description: "Website pages, owner edits, and uploaded info that support setup fields.", kind: "list", extractable: true, assistantCanEdit: false, userCanEdit: false, affectsLiveRuntime: false },
  { id: "activation.gates", pathPattern: "/activationGates", section: "sources_activation", label: "Activation gates", description: "Review, phone routing, billing, and final test requirements.", kind: "list", extractable: false, assistantCanEdit: true, userCanEdit: true, affectsLiveRuntime: true, highImpact: true },
];

export function fieldsForSetupSection(id: SetupSectionId) {
  return fieldRegistry.filter((field) => field.section === id);
}

export function getSetupSection(id: SetupSectionId) {
  return setupSections.find((section) => section.id === id);
}

export function summarizeSetupCounts(setup: AnsweringSetup) {
  return {
    services: setup.services.filter((service) => service.enabled).length,
    approvedAnswers: setup.approvedAnswers.length,
    requestFields: setup.requestCapture.fields.length,
    ownerAlertContacts: setup.ownerAlerts.contacts.filter((contact) => contact.enabled).length,
    sources: setup.sources.length,
    reviewGates: setup.activationGates.filter((gate) => gate.status !== "complete").length,
  };
}

export function setupSectionStatus(setup: AnsweringSetup, section: SetupSectionDefinition): SetupGateStatus | "complete" {
  const statuses = section.gateIds
    .map((gateId) => setup.activationGates.find((gate) => gate.id === gateId)?.status)
    .filter((status): status is SetupGateStatus => Boolean(status));
  if (!statuses.length) return "complete";
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("needs_review")) return "needs_review";
  return "complete";
}
