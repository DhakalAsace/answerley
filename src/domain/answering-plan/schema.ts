import { z } from "zod";

const NullableText = z.string().trim().nullable();
const Identifier = z.string().min(1);
const UrlText = z.string().url().nullable();

export const SourceTypeSchema = z.enum([
  "website",
  "google_business_profile",
  "user",
  "assistant",
  "answerley_default",
  "integration",
  "system",
]);

export const SourceReferenceSchema = z.object({
  sourceType: SourceTypeSchema,
  sourceDocumentId: z.string().nullable().default(null),
  sourceUrl: UrlText.default(null),
  sourceLabel: NullableText.default(null),
  excerpt: NullableText.default(null),
  observedAt: z.string().datetime().nullable().default(null),
});

export const FieldConflictSchema = z.object({
  value: z.unknown(),
  source: SourceReferenceSchema,
  note: NullableText.default(null),
});

export const FieldMetadataEntrySchema = z.object({
  sourceType: SourceTypeSchema,
  sources: z.array(SourceReferenceSchema).default([]),
  confidence: z.number().min(0).max(1).nullable().default(null),
  confirmedByUser: z.boolean().default(false),
  confirmedAt: z.string().datetime().nullable().default(null),
  lastChangedBy: z
    .enum(["website_builder", "plan_assistant", "manual_ui", "system", "integration"])
    .default("system"),
  lastChangedAt: z.string().datetime().nullable().default(null),
  conflicts: z.array(FieldConflictSchema).default([]),
  note: NullableText.default(null),
});

export const FieldMetadataMapSchema = z.record(
  z.string(),
  FieldMetadataEntrySchema,
);

export const LinkResourceSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  label: z.string().min(1),
  type: z.enum([
    "booking",
    "contact",
    "pricing",
    "offering",
    "faq",
    "policy",
    "location",
    "payment",
    "custom",
  ]),
  url: z.string().url(),
  description: NullableText.default(null),
});

export const BusinessProfileSchema = z.object({
  businessName: NullableText.default(null),
  legalName: NullableText.default(null),
  websiteUrl: UrlText.default(null),
  businessType: z.object({
    label: NullableText.default(null),
    description: NullableText.default(null),
    aliases: z.array(z.string()).default([]),
  }),
  description: NullableText.default(null),
  timezone: NullableText.default(null),
  primaryLanguage: z.string().default("en"),
  additionalLanguages: z.array(z.string()).default([]),
  publicContact: z.object({
    phone: NullableText.default(null),
    email: z.string().email().nullable().default(null),
    contactUrl: UrlText.default(null),
  }),
  address: z.object({
    line1: NullableText.default(null),
    line2: NullableText.default(null),
    city: NullableText.default(null),
    region: NullableText.default(null),
    postalCode: NullableText.default(null),
    country: NullableText.default(null),
  }),
  businessNamePronunciation: NullableText.default(null),
});

export const TemporaryUpdateSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  title: z.string().min(1),
  message: z.string().min(1),
  mentionWhen: z.enum(["every_call", "when_relevant", "after_hours"]),
  startsAt: z.string().datetime().nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
  removeAutomatically: z.boolean().default(true),
});

export const PricingSchema = z.object({
  mode: z.enum([
    "do_not_quote",
    "starting_price",
    "range",
    "fixed",
    "approved_custom_wording",
  ]),
  currency: z.string().default("USD"),
  startingPrice: z.number().nonnegative().nullable().default(null),
  minimumPrice: z.number().nonnegative().nullable().default(null),
  maximumPrice: z.number().nonnegative().nullable().default(null),
  fixedPrice: z.number().nonnegative().nullable().default(null),
  approvedWording: NullableText.default(null),
});

export const OfferingSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  title: NullableText.default(null),
  description: NullableText.default(null),
  aliases: z.array(z.string()).default([]),
  canAnswerQuestions: z.boolean().default(true),
  requestable: z.boolean().default(true),
  bookable: z.boolean().default(false),
  canSendBookingLink: z.boolean().default(false),
  pricing: PricingSchema,
  requestTypeId: z.string().nullable().default(null),
  intakeFieldIds: z.array(z.string()).default([]),
  locationIds: z.array(z.string()).default([]),
  linkIds: z.array(z.string()).default([]),
  additionalInstructions: NullableText.default(null),
});

export const TimeRangeSchema = z.object({
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const DayScheduleSchema = z.object({
  open: z.boolean(),
  periods: z.array(TimeRangeSchema).default([]),
  note: NullableText.default(null),
});

export const WeeklyScheduleSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema,
});

export const SpecialDateSchema = z.object({
  id: Identifier,
  date: z.string(),
  open: z.boolean(),
  periods: z.array(TimeRangeSchema).default([]),
  note: NullableText.default(null),
});

export const HoursAvailabilitySchema = z.object({
  enabled: z.boolean().default(true),
  timezone: NullableText.default(null),
  regularHours: WeeklyScheduleSchema,
  specialDates: z.array(SpecialDateSchema).default([]),
  afterHours: z.object({
    enabled: z.boolean().default(true),
    mode: z.enum([
      "same_as_open_hours",
      "take_message",
      "offer_next_available",
      "transfer",
      "custom",
    ]),
    instructions: NullableText.default(null),
    callerWording: NullableText.default(null),
    routingRuleId: z.string().nullable().default(null),
  }),
  availabilityNotes: NullableText.default(null),
});

export const LocationSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  description: NullableText.default(null),
  address: z.object({
    line1: NullableText.default(null),
    line2: NullableText.default(null),
    city: NullableText.default(null),
    region: NullableText.default(null),
    postalCode: NullableText.default(null),
    country: NullableText.default(null),
  }),
  phone: NullableText.default(null),
  email: z.string().email().nullable().default(null),
  hoursOverride: WeeklyScheduleSchema.nullable().default(null),
  offeringIds: z.array(z.string()).default([]),
  bookingLinkId: z.string().nullable().default(null),
  routingRuleId: z.string().nullable().default(null),
});

export const ServiceAreaSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  type: z.enum(["city", "postal_code", "county", "region", "radius", "custom"]),
  label: z.string().min(1),
  value: z.string().min(1),
  excluded: z.boolean().default(false),
});

export const LocationsCoverageSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum([
    "single_location",
    "multiple_locations",
    "service_area",
    "remote",
    "hybrid",
    "not_applicable",
  ]),
  locations: z.array(LocationSchema).default([]),
  serviceAreas: z.array(ServiceAreaSchema).default([]),
  callerFacingDescription: NullableText.default(null),
});

export const KnowledgeItemSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  type: z.enum(["faq", "policy"]),
  title: z.string().min(1),
  question: z.string().min(1),
  alternativeQuestions: z.array(z.string()).default([]),
  answer: z.string().min(1),
  behavior: z.object({
    mode: z.enum([
      "answer_directly",
      "answer_and_send_link",
      "take_message",
      "escalate",
      "do_not_answer",
    ]),
    linkId: z.string().nullable().default(null),
    routingRuleId: z.string().nullable().default(null),
  }),
  appliesTo: z.object({
    offeringIds: z.array(z.string()).default([]),
    locationIds: z.array(z.string()).default([]),
  }),
  internalNotes: NullableText.default(null),
});

export const IntakeFieldSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  label: z.string().min(1),
  key: z.string().min(1),
  type: z.enum([
    "text",
    "multiline_text",
    "phone",
    "email",
    "number",
    "date",
    "time",
    "datetime",
    "choice",
    "multi_choice",
    "yes_no",
    "address",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  spokenPrompt: NullableText.default(null),
  validationInstructions: NullableText.default(null),
  askWhen: z.object({
    mode: z.enum(["always", "request_type", "offering", "scenario", "custom"]),
    requestTypeIds: z.array(z.string()).default([]),
    offeringIds: z.array(z.string()).default([]),
    scenarioIds: z.array(z.string()).default([]),
    customCondition: NullableText.default(null),
  }),
  order: z.number().int().nonnegative().default(0),
});

export const RequestTypeSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  singularLabel: z.string().min(1),
  pluralLabel: z.string().min(1),
  description: NullableText.default(null),
  intakeFieldIds: z.array(z.string()).default([]),
  completionMode: z.enum([
    "create_request",
    "send_link",
    "book",
    "notify_only",
    "take_message",
  ]),
  defaultAssigneeContactIds: z.array(z.string()).default([]),
  confirmationWording: NullableText.default(null),
  statuses: z.array(z.string()).default(["requested", "in_progress", "completed"]),
});

export const BookingSchema = z.object({
  enabled: z.boolean().default(false),
  defaultMethod: z.enum([
    "none",
    "send_link",
    "collect_preferred_time",
    "connected_calendar",
    "book_directly",
    "request_only",
  ]),
  bookingLinkId: z.string().nullable().default(null),
  integrationConnectionId: z.string().nullable().default(null),
  defaultIntakeFieldIds: z.array(z.string()).default([]),
  confirmationWording: NullableText.default(null),
  unavailableBehavior: z.object({
    mode: z.enum(["collect_preferred_time", "take_message", "send_link", "custom"]),
    wording: NullableText.default(null),
  }),
  offeringOverrides: z.array(
    z.object({
      offeringId: Identifier,
      method: z.enum([
        "none",
        "send_link",
        "collect_preferred_time",
        "connected_calendar",
        "book_directly",
        "request_only",
      ]),
      bookingLinkId: z.string().nullable().default(null),
      intakeFieldIds: z.array(z.string()).default([]),
    }),
  ),
});

export const ScenarioActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer_approved_information"), knowledgeItemIds: z.array(z.string()).default([]) }),
  z.object({ type: z.literal("ask_clarifying_question"), instruction: z.string().min(1) }),
  z.object({ type: z.literal("collect_information"), intakeFieldIds: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("create_request"), requestTypeId: Identifier }),
  z.object({ type: z.literal("take_message"), intakeFieldIds: z.array(z.string()).default([]) }),
  z.object({ type: z.literal("send_link"), linkId: Identifier }),
  z.object({ type: z.literal("prepare_follow_up"), followUpId: Identifier }),
  z.object({ type: z.literal("notify"), recipientIds: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("transfer"), routingRuleId: Identifier }),
  z.object({ type: z.literal("use_fallback"), instruction: NullableText.default(null) }),
  z.object({ type: z.literal("end_interaction"), wording: NullableText.default(null) }),
]);

export const ScenarioSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  description: NullableText.default(null),
  whenCaller: z.string().min(1),
  exampleCallerPhrases: z.array(z.string()).default([]),
  priority: z.number().int().default(100),
  appliesWhen: z.object({
    timeMode: z.enum(["any", "business_hours", "after_hours", "custom"]),
    locationIds: z.array(z.string()).default([]),
    offeringIds: z.array(z.string()).default([]),
    customCondition: NullableText.default(null),
  }),
  actions: z.array(ScenarioActionSchema).min(1),
  collectFieldIds: z.array(z.string()).default([]),
  requestTypeId: z.string().nullable().default(null),
  notifyRecipientIds: z.array(z.string()).default([]),
  fallback: z.object({
    mode: z.enum(["take_message", "notify", "transfer", "unknown_handling", "custom"]),
    instruction: NullableText.default(null),
    routingRuleId: z.string().nullable().default(null),
  }),
  callerWording: NullableText.default(null),
});

export const RoutingContactSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  roleLabel: NullableText.default(null),
  phone: NullableText.default(null),
  email: z.string().email().nullable().default(null),
  availabilityNote: NullableText.default(null),
  notificationPreferences: z.object({
    sms: z.boolean().default(true),
    email: z.boolean().default(false),
    call: z.boolean().default(true),
  }),
});

export const RoutingTeamSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  description: NullableText.default(null),
  contactIds: z.array(z.string()).default([]),
});

export const RoutingActionSchema = z.object({
  action: z.enum(["transfer", "take_message", "notify", "take_message_and_notify", "custom"]),
  recipientIds: z.array(z.string()).default([]),
  instruction: NullableText.default(null),
});

export const RoutingRuleSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  appliesWhen: z.object({
    scenarioIds: z.array(z.string()).default([]),
    requestTypeIds: z.array(z.string()).default([]),
    locationIds: z.array(z.string()).default([]),
    timeMode: z.enum(["any", "business_hours", "after_hours", "custom"]),
    customCondition: NullableText.default(null),
  }),
  duringBusinessHours: RoutingActionSchema,
  afterHours: RoutingActionSchema,
  transferSequence: z.array(
    z.object({
      recipientId: Identifier,
      waitSeconds: z.number().int().min(5).max(120).default(20),
    }),
  ),
  ifUnanswered: RoutingActionSchema,
  notifyRecipientIds: z.array(z.string()).default([]),
  callerWording: NullableText.default(null),
});

export const RoutingSchema = z.object({
  enabled: z.boolean().default(true),
  contacts: z.array(RoutingContactSchema).default([]),
  teams: z.array(RoutingTeamSchema).default([]),
  rules: z.array(RoutingRuleSchema).default([]),
  defaults: z.object({
    waitSeconds: z.number().int().min(5).max(120).default(20),
    unansweredMode: z.enum(["take_message", "notify", "take_message_and_notify"]),
  }),
});

export const FollowUpRuleSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  trigger: z.enum([
    "dropped_call",
    "booking_link_requested",
    "message_taken",
    "request_captured",
    "after_hours_call",
    "owner_alert",
    "new_lead",
    "important_call",
    "custom_scenario",
  ]),
  scenarioIds: z.array(z.string()).default([]),
  channel: z.enum(["sms", "email", "in_app"]),
  recipientType: z.enum(["caller", "contact", "team", "custom"]),
  recipientIds: z.array(z.string()).default([]),
  messageText: z.string().min(1),
  includeLink: z.boolean().default(false),
  linkId: z.string().nullable().default(null),
  notifyOwner: z.boolean().default(false),
  sendingWindow: z.object({
    mode: z.enum(["anytime", "business_hours", "custom"]),
    customRule: NullableText.default(null),
  }),
});

export const UnknownHandlingSchema = z.object({
  enabled: z.boolean().default(true),
  askClarifyingQuestion: z.boolean().default(true),
  maximumClarificationAttempts: z.number().int().min(0).max(3).default(1),
  defaultAction: z.enum(["take_message", "create_request", "notify", "transfer", "custom"]),
  collectFieldIds: z.array(z.string()).default([]),
  callerWording: z.string().min(1),
  notifyRecipientIds: z.array(z.string()).default([]),
  routingRuleId: z.string().nullable().default(null),
  createImprovementSuggestion: z.boolean().default(true),
  customInstruction: NullableText.default(null),
});

export const SpamScreeningSchema = z.object({
  enabled: z.boolean().default(true),
  blockLikelyRobocalls: z.boolean().default(true),
  hideLikelySpamFromCalls: z.boolean().default(true),
  countBlockedTowardUsage: z.boolean().default(false),
  allowUnknownLocalNumbers: z.boolean().default(true),
  suspectedSpamAction: z.enum(["block", "screen", "allow"]).default("screen"),
});

export const GreetingVoiceSchema = z.object({
  enabled: z.boolean().default(true),
  openingGreeting: NullableText.default(null),
  assistantName: NullableText.default(null),
  voiceId: NullableText.default(null),
  tone: z.enum([
    "warm_helpful",
    "professional",
    "calm_reassuring",
    "straight_to_the_point",
    "mature_trustworthy",
    "custom",
  ]),
  customToneInstructions: NullableText.default(null),
  primaryLanguage: z.string().default("en"),
  additionalLanguages: z.array(z.string()).default([]),
  businessNamePronunciation: NullableText.default(null),
  closingWording: NullableText.default(null),
  voicePreviewText: NullableText.default(null),
});

export const GlobalRulesSchema = z.object({
  approvedKnowledgeOnly: z.boolean().default(true),
  doNotInventBusinessFacts: z.boolean().default(true),
  askOneQuestionAtATime: z.boolean().default(true),
  avoidRepeatingCollectedInformation: z.boolean().default(true),
  confirmBeforeCreatingRequest: z.boolean().default(true),
  pricingDefault: z.enum(["do_not_quote", "use_offering_setting"]).default("use_offering_setting"),
  conversationStyle: z.enum(["natural", "concise", "direct", "custom"]).default("natural"),
  customInstructions: NullableText.default(null),
});

export const AnsweringPlanDocumentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  businessProfile: BusinessProfileSchema,
  temporaryUpdates: z.array(TemporaryUpdateSchema).default([]),
  offerings: z.array(OfferingSchema).default([]),
  hoursAvailability: HoursAvailabilitySchema,
  locationsCoverage: LocationsCoverageSchema,
  knowledgeItems: z.array(KnowledgeItemSchema).default([]),
  requestTypes: z.array(RequestTypeSchema).default([]),
  intakeFields: z.array(IntakeFieldSchema).default([]),
  booking: BookingSchema,
  scenarios: z.array(ScenarioSchema).default([]),
  routing: RoutingSchema,
  followUps: z.array(FollowUpRuleSchema).default([]),
  unknownHandling: UnknownHandlingSchema,
  spamScreening: SpamScreeningSchema,
  greetingVoice: GreetingVoiceSchema,
  links: z.array(LinkResourceSchema).default([]),
  globalRules: GlobalRulesSchema,
});

export const AnsweringPlanEnvelopeSchema = z.object({
  id: Identifier,
  businessId: Identifier,
  revision: z.number().int().positive(),
  publishedRevision: z.number().int().positive().nullable().default(null),
  document: AnsweringPlanDocumentSchema,
  fieldMetadata: FieldMetadataMapSchema.default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AnsweringPlanDocument = z.infer<typeof AnsweringPlanDocumentSchema>;
export type AnsweringPlanEnvelope = z.infer<typeof AnsweringPlanEnvelopeSchema>;
export type FieldMetadataMap = z.infer<typeof FieldMetadataMapSchema>;
export type ScenarioAction = z.infer<typeof ScenarioActionSchema>;
export type IntakeField = z.infer<typeof IntakeFieldSchema>;
export type RequestType = z.infer<typeof RequestTypeSchema>;
export type Offering = z.infer<typeof OfferingSchema>;
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;
export type FollowUpRule = z.infer<typeof FollowUpRuleSchema>;

export const AnsweringPlanJsonSchemaDescription = {
  title: "Answerley Answering Plan v1",
  description:
    "The single canonical business knowledge and call-handling configuration used by onboarding, dashboard editing, the plan assistant, browser testing, and live calls.",
  schemaVersion: "1.0.0",
} as const;
