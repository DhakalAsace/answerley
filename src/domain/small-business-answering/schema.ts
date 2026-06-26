import { z } from "zod";

export const SBA_SCHEMA_VERSION = "2.0.0-small-business-answering" as const;

const Identifier = z.string().min(1);
const NullableText = z.string().trim().nullable();
const UrlText = z.string().url().nullable();
const EmailText = z.string().email().nullable();
const PhoneText = z.string().trim().nullable();

export const TimeRangeSchema = z.object({
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const DayHoursSchema = z.object({
  open: z.boolean(),
  periods: z.array(TimeRangeSchema).default([]),
  callerWording: NullableText.default(null),
});

export const WeeklyHoursSchema = z.object({
  monday: DayHoursSchema,
  tuesday: DayHoursSchema,
  wednesday: DayHoursSchema,
  thursday: DayHoursSchema,
  friday: DayHoursSchema,
  saturday: DayHoursSchema,
  sunday: DayHoursSchema,
});

export const SetupStatusSchema = z.object({
  mode: z.enum(["draft", "testing", "live", "paused"]),
  draftRevision: z.number().int().nonnegative(),
  liveRevision: z.number().int().nonnegative(),
  isLive: z.boolean(),
  isPaused: z.boolean(),
  lastPublishedAt: z.string().datetime().nullable().default(null),
  lastTestedAt: z.string().datetime().nullable().default(null),
  needsReview: z.boolean(),
});

export const AddressSchema = z.object({
  line1: NullableText.default(null),
  line2: NullableText.default(null),
  city: NullableText.default(null),
  region: NullableText.default(null),
  postalCode: NullableText.default(null),
  country: NullableText.default(null),
});

export const BusinessSchema = z.object({
  name: z.string().min(1),
  websiteUrl: UrlText.default(null),
  publicPhone: PhoneText.default(null),
  publicEmail: EmailText.default(null),
  timezone: z.string().min(1),
  primaryLanguage: z.string().default("en"),
  additionalLanguages: z.array(z.string()).default([]),
  pronunciation: NullableText.default(null),
  address: AddressSchema,
  serviceArea: z.object({
    summary: NullableText.default(null),
    areas: z.array(z.string()).default([]),
  }),
});

export const ServiceSchema = z.object({
  id: Identifier,
  enabled: z.boolean().default(true),
  name: z.string().min(1),
  approvedDescription: NullableText.default(null),
  aliases: z.array(z.string()).default([]),
  canAnswerQuestions: z.boolean().default(true),
  canCaptureRequest: z.boolean().default(true),
  appointmentEligible: z.boolean().default(false),
  pricingWording: NullableText.default(null),
});

export const ApprovedAnswerSchema = z.object({
  id: Identifier,
  question: z.string().min(1),
  answer: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  needsReview: z.boolean().default(false),
});

export const HoursSchema = z.object({
  timezone: z.string().min(1),
  regular: WeeklyHoursSchema,
  temporaryUpdate: z
    .object({
      title: z.string().min(1),
      message: z.string().min(1),
      expiresAt: z.string().datetime().nullable().default(null),
    })
    .nullable()
    .default(null),
  afterHours: z.object({
    enabled: z.boolean().default(true),
    mode: z.enum(["take_message", "urgent_only", "send_booking_link", "closed_message"]),
    callerWording: NullableText.default(null),
    urgentWording: NullableText.default(null),
  }),
});

export const CallHandlingSchema = z.object({
  mode: z.enum(["owner_first", "overflow", "after_hours", "immediate", "urgent_only", "paused"]),
  answerTiming: z.object({
    ringDelaySeconds: z.number().int().min(0).max(120),
    answerWhenClosed: z.boolean().default(true),
    answerWhenBusy: z.boolean().default(true),
  }),
  callerGreeting: z.string().min(1),
  unknownAnswerBehavior: z.enum(["take_message_and_flag", "say_not_sure_and_offer_message", "route_to_owner"]),
});

export const RequestFieldSchema = z.enum([
  "caller_name",
  "phone",
  "email",
  "reason",
  "service_needed",
  "address",
  "urgency",
  "preferred_time",
]);

export const RequestCaptureSchema = z.object({
  fields: z.array(RequestFieldSchema).default([]),
  callerSummaryWording: z.string().min(1),
});

export const AppointmentHandlingSchema = z.object({
  mode: z.enum(["capture_request", "send_booking_link", "calendar_booking"]),
  bookingLinkUrl: UrlText.default(null),
  calendarIntegration: z.enum(["none", "connected"]).default("none"),
  doNotCallBookedUntilConfirmed: z.boolean().default(true),
});

export const UrgentRoutingSchema = z.object({
  enabled: z.boolean().default(true),
  detectionPhrases: z.array(z.string()).default([]),
  collectFields: z.array(RequestFieldSchema).default([]),
  transferEnabled: z.boolean().default(false),
  alertContactIds: z.array(z.string()).default([]),
});

export const AlertContactSchema = z.object({
  id: Identifier,
  role: z.enum(["owner", "office", "on_call", "backup"]),
  name: z.string().min(1),
  sms: PhoneText.default(null),
  email: EmailText.default(null),
  enabled: z.boolean().default(true),
});

export const OwnerAlertsSchema = z.object({
  contacts: z.array(AlertContactSchema).default([]),
  channels: z.array(z.enum(["sms", "email"])).default([]),
  messageTemplate: z.string().min(1),
});

export const CallerConfirmationsSchema = z.object({
  enabled: z.boolean().default(false),
  smsTemplate: NullableText.default(null),
  sendBookingLinkWhenRelevant: z.boolean().default(true),
});

export const SpamScreeningSchema = z.object({
  enabled: z.boolean().default(true),
  keepOutOfBillableUsage: z.boolean().default(true),
  callerWording: z.string().min(1),
});

export const PrivacySchema = z.object({
  callRecording: z.enum(["off", "on_with_disclosure"]),
  retentionDays: z.number().int().positive(),
  callerDisclosure: z.string().min(1),
});

export const EvidenceSourceSchema = z.object({
  id: Identifier,
  type: z.enum(["website", "owner_edit", "uploaded_info", "system"]),
  label: z.string().min(1),
  url: UrlText.default(null),
  excerpt: NullableText.default(null),
  capturedAt: z.string().datetime().nullable().default(null),
});

export const ActivationGateSchema = z.object({
  id: Identifier,
  label: z.string().min(1),
  status: z.enum(["complete", "needs_review", "blocked"]),
  description: z.string().min(1),
});

export const AnsweringSetupSchema = z.object({
  schemaVersion: z.literal(SBA_SCHEMA_VERSION),
  setupId: Identifier,
  businessId: Identifier,
  brand: z.literal("Small Business Answering"),
  status: SetupStatusSchema,
  business: BusinessSchema,
  services: z.array(ServiceSchema).default([]),
  approvedAnswers: z.array(ApprovedAnswerSchema).default([]),
  hours: HoursSchema,
  callHandling: CallHandlingSchema,
  requestCapture: RequestCaptureSchema,
  appointmentHandling: AppointmentHandlingSchema,
  urgentRouting: UrgentRoutingSchema,
  ownerAlerts: OwnerAlertsSchema,
  callerConfirmations: CallerConfirmationsSchema,
  spamScreening: SpamScreeningSchema,
  privacy: PrivacySchema,
  sources: z.array(EvidenceSourceSchema).default([]),
  activationGates: z.array(ActivationGateSchema).default([]),
});

export type AnsweringSetup = z.infer<typeof AnsweringSetupSchema>;
