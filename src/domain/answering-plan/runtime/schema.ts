import { z } from "zod";

export const LiveToolNameSchema = z.enum([
  "record_collected_field",
  "create_request",
  "capture_message",
  "prepare_follow_up",
  "prepare_owner_alert",
  "lookup_current_plan_info",
  "simulate_transfer",
  "transfer_call",
  "record_unknown_question",
  "end_call_with_summary",
]);

export const LiveToolDefinitionSchema = z.object({
  name: LiveToolNameSchema,
  enabled: z.boolean(),
  mode: z.enum(["test", "live", "both"]),
  description: z.string().min(1),
  invocationCondition: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()),
  successMeaning: z.string().min(1),
  failureBehavior: z.string().min(1),
});

export const RuntimeCoverageMapSchema = z.object({
  offeringIds: z.array(z.string()).default([]),
  knowledgeItemIds: z.array(z.string()).default([]),
  requestTypeIds: z.array(z.string()).default([]),
  intakeFieldIds: z.array(z.string()).default([]),
  scenarioIds: z.array(z.string()).default([]),
  routingRuleIds: z.array(z.string()).default([]),
  followUpIds: z.array(z.string()).default([]),
  linkIds: z.array(z.string()).default([]),
});

export const RuntimeWarningSchema = z.object({
  code: z.string(),
  severity: z.enum(["info", "warning", "blocking"]),
  planPath: z.string().nullable().default(null),
  message: z.string(),
});

export const LiveRuntimePackSchema = z.object({
  runtimeVersion: z.literal("1.0.0"),
  compilerVersion: z.string(),
  planId: z.string(),
  planRevision: z.number().int().positive(),
  mode: z.enum(["test", "live"]),
  model: z.string(),
  generatedAt: z.string().datetime(),
  layers: z.object({
    identity: z.string().min(1),
    voiceAndSpeakingStyle: z.string().min(1),
    roleBoundary: z.string().min(1),
    conversationRules: z.string().min(1),
    groundingRules: z.string().min(1),
    businessContext: z.string().min(1),
    workflowRules: z.string().min(1),
    toolPolicy: z.string().min(1),
    modeRules: z.string().min(1),
    sessionRules: z.string().min(1),
  }),
  systemInstruction: z.string().min(1),
  tools: z.array(LiveToolDefinitionSchema),
  coverage: RuntimeCoverageMapSchema,
  warnings: z.array(RuntimeWarningSchema).default([]),
  sourceHash: z.string().min(1),
});

export type LiveRuntimePack = z.infer<typeof LiveRuntimePackSchema>;
export type LiveToolDefinition = z.infer<typeof LiveToolDefinitionSchema>;
export type RuntimeWarning = z.infer<typeof RuntimeWarningSchema>;
