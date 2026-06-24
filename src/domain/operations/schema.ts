import { z } from "zod";

export const CallModeSchema = z.enum(["test", "live"]);
export const CallStatusSchema = z.enum([
  "connecting",
  "active",
  "completed",
  "failed",
  "abandoned",
  "blocked_spam",
]);
export const UrgencySchema = z.enum(["normal", "important", "urgent"]);
export const SentimentSchema = z.enum([
  "positive",
  "neutral",
  "frustrated",
  "angry",
  "unclear",
]);

export const CallSchema = z.object({
  id: z.string(),
  organizationId: z.string().nullable().default(null),
  businessId: z.string(),
  planVersionId: z.string(),
  planRevision: z.number().int().positive(),
  mode: CallModeSchema,
  status: CallStatusSchema,
  providerCallId: z.string().nullable().default(null),
  callerName: z.string().nullable().default(null),
  callerPhone: z.string().nullable().default(null),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().default(null),
  durationSeconds: z.number().int().nonnegative().nullable().default(null),
  sentiment: SentimentSchema.nullable().default(null),
  urgency: UrgencySchema.default("normal"),
  summary: z.string().nullable().default(null),
  outcome: z.string().nullable().default(null),
  resolved: z.boolean().nullable().default(null),
  ownerNotified: z.boolean().default(false),
  matchedScenarioIds: z.array(z.string()).default([]),
  matchedRoutingRuleIds: z.array(z.string()).default([]),
  audioUrl: z.string().url().nullable().default(null),
  recordingStatus: z.enum(["none", "processing", "ready", "failed"]).default("none"),
});

export const CallEventSchema = z.object({
  id: z.string(),
  callId: z.string(),
  sequence: z.number().int().nonnegative(),
  planObjectType: z.string().nullable().default(null),
  planObjectId: z.string().nullable().default(null),
  operationalObjectType: z.string().nullable().default(null),
  operationalObjectId: z.string().nullable().default(null),
  type: z.enum([
    "call_started",
    "greeting_spoken",
    "question_answered",
    "field_collected",
    "request_created",
    "message_captured",
    "follow_up_prepared",
    "follow_up_sent",
    "owner_alert_prepared",
    "owner_alert_sent",
    "transfer_prepared",
    "transfer_attempted",
    "transfer_connected",
    "transfer_failed",
    "unknown_question",
    "spam_blocked",
    "call_ended",
    "error",
  ]),
  label: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export const TranscriptTurnSchema = z.object({
  id: z.string(),
  callId: z.string(),
  sequence: z.number().int().nonnegative(),
  speaker: z.enum(["caller", "answerley", "system"]),
  text: z.string(),
  startedAtMs: z.number().int().nonnegative().nullable().default(null),
  endedAtMs: z.number().int().nonnegative().nullable().default(null),
  interrupted: z.boolean().default(false),
});

export const RequestSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  callId: z.string().nullable().default(null),
  planVersionId: z.string(),
  requestTypeId: z.string(),
  offeringId: z.string().nullable().default(null),
  status: z.string(),
  callerName: z.string().nullable().default(null),
  callerPhone: z.string().nullable().default(null),
  callerEmail: z.string().nullable().default(null),
  collectedFields: z.record(z.string(), z.unknown()).default({}),
  preferredDateTime: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  assignedContactIds: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MessageSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  callId: z.string().nullable().default(null),
  requestId: z.string().nullable().default(null),
  planVersionId: z.string().nullable().default(null),
  followUpRuleId: z.string().nullable().default(null),
  direction: z.enum(["outbound", "inbound", "internal"]),
  category: z.enum(["caller_message", "caller_follow_up", "owner_alert", "system"]),
  channel: z.enum(["sms", "email", "in_app"]),
  mode: CallModeSchema,
  status: z.enum(["captured", "prepared", "simulated", "queued", "sent", "delivered", "failed"]),
  recipientLabel: z.string().nullable().default(null),
  recipientAddress: z.string().nullable().default(null),
  body: z.string(),
  providerMessageId: z.string().nullable().default(null),
  errorMessage: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable().default(null),
});

export const PhoneNumberSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  provider: z.string(),
  providerNumberId: z.string().nullable().default(null),
  e164: z.string(),
  displayNumber: z.string(),
  type: z.enum(["answerley_number", "forwarded_business_number"]),
  status: z.enum(["pending", "active", "paused", "failed", "released"]),
  forwardingMode: z.enum(["none", "overflow", "after_hours", "all_calls"]),
  forwardingStatus: z.enum(["not_configured", "instructions_shown", "verifying", "active", "failed"]),
  createdAt: z.string().datetime(),
});

export const UsageEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  businessId: z.string(),
  callId: z.string().nullable().default(null),
  type: z.enum([
    "voice_second",
    "call_started",
    "call_completed",
    "message_prepared",
    "message_sent",
    "transfer_attempted",
    "request_created",
    "spam_blocked",
  ]),
  quantity: z.number().nonnegative(),
  occurredAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  stripeCustomerId: z.string().nullable().default(null),
  stripeSubscriptionId: z.string().nullable().default(null),
  planKey: z.string(),
  status: z.enum(["none", "trialing", "active", "past_due", "paused", "canceled"]),
  currentPeriodStart: z.string().datetime().nullable().default(null),
  currentPeriodEnd: z.string().datetime().nullable().default(null),
  cancelAtPeriodEnd: z.boolean().default(false),
});

export const IntegrationConnectionSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  type: z.enum(["calendar", "booking", "crm", "telephony", "sms", "custom"]),
  provider: z.string(),
  displayName: z.string(),
  status: z.enum(["pending", "connected", "needs_attention", "disconnected"]),
  externalAccountId: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});


export const PlanImprovementSuggestionSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  callId: z.string().nullable().default(null),
  planVersionId: z.string().nullable().default(null),
  suggestionType: z.enum(["unknown_question", "missing_information", "behavior_change", "source_conflict", "custom"]),
  title: z.string(),
  detail: z.string().nullable().default(null),
  sourceQuestion: z.string().nullable().default(null),
  proposedPatch: z.array(z.record(z.string(), z.unknown())).nullable().default(null),
  status: z.enum(["open", "applied", "dismissed"]).default("open"),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable().default(null),
});

export const AuditEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  businessId: z.string().nullable().default(null),
  actorUserId: z.string().nullable().default(null),
  actorType: z.enum(["user", "assistant", "system", "integration"]),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export const GuestSessionSchema = z.object({
  id: z.string(),
  submittedBusiness: z.string().nullable().default(null),
  state: z.enum(["created", "importing", "test_ready", "tested", "claimed", "expired"]),
  schemaVersion: z.string(),
  planRevision: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  claimedAt: z.string().datetime().nullable().default(null),
});

export type Call = z.infer<typeof CallSchema>;
export type CallEvent = z.infer<typeof CallEventSchema>;
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>;
export type RequestRecord = z.infer<typeof RequestSchema>;
export type MessageRecord = z.infer<typeof MessageSchema>;
export type PhoneNumberRecord = z.infer<typeof PhoneNumberSchema>;
export type UsageEvent = z.infer<typeof UsageEventSchema>;
export type SubscriptionRecord = z.infer<typeof SubscriptionSchema>;
export type PlanImprovementSuggestion = z.infer<typeof PlanImprovementSuggestionSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type GuestSession = z.infer<typeof GuestSessionSchema>;
