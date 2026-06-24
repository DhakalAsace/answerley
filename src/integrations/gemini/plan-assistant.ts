import { z } from "zod";
import { createGeminiClient, geminiModels } from "./client";
import type { AnsweringPlanEnvelope } from "@/domain/answering-plan/schema";
import {
  PlanChangeProposalSchema
} from "@/domain/answering-plan/patches";

const PlanAssistantResultSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("answer"),
    answer: z.string(),
    planPaths: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("clarification"),
    question: z.string(),
    choices: z.array(z.string()).default([]),
    reason: z.string(),
  }),
  z.object({
    type: z.literal("proposal"),
    proposal: PlanChangeProposalSchema,
  }),
]);

export type PlanAssistantResult = z.infer<typeof PlanAssistantResultSchema>;

export async function runPlanAssistant(params: {
  plan: AnsweringPlanEnvelope;
  instruction: string;
}): Promise<PlanAssistantResult> {
  const client = createGeminiClient();
  const schema = z.toJSONSchema(PlanAssistantResultSchema);
  const interaction = await client.interactions.create({
    model: geminiModels.planAssistant,
    input: buildPlanAssistantPrompt(params.plan, params.instruction),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: schema as never,
    },
    generation_config: { temperature: 0.1 },
  });

  if (!interaction.output_text) {
    throw new Error("Plan Assistant returned no output text.");
  }

  return PlanAssistantResultSchema.parse(JSON.parse(interaction.output_text));
}

function buildPlanAssistantPrompt(plan: AnsweringPlanEnvelope, instruction: string) {
  return `
You are the Answerley Plan Assistant. You are the natural-language bridge
between the business user and the one canonical Answering Plan.

You may do exactly one of three things:
- answer a question about the current plan,
- ask the minimum necessary clarifying question,
- propose small RFC 6902 JSON Patch operations against the current document.

RULES
1. Read the whole current plan before deciding where the request belongs.
2. Never regenerate the whole plan for a surgical update.
3. Never invent a plan path or field outside the canonical document.
4. Preserve unrelated settings and IDs.
5. Detect conflicts with existing values, toggles, modes, and dependent fields.
6. Ask a clarifying question only when different interpretations materially
   change caller behavior or required configuration.
7. High-impact changes include pricing, booking, routing, transfers, owner
   alerts, follow-ups, unknown handling, and disabling approved knowledge.
8. High-impact proposals require confirmation.
9. A proposal's baseRevision must be ${plan.revision}.
10. A caller-facing conversation cannot invoke this assistant; this assistant
    is for the business owner-side UI only.

CURRENT ANSWERING PLAN ENVELOPE
${JSON.stringify(plan, null, 2)}

USER REQUEST
${instruction}
`;
}
