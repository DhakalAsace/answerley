import { z } from "zod";
import { createGeminiClient, geminiModels, geminiTextGenerationConfig } from "./client";
import {
  fieldRegistry,
  setupSections,
  type AnsweringSetup,
} from "@/domain/small-business-answering";
import { SetupChangeProposalSchema } from "@/domain/small-business-answering/patches";

const SetupAssistantResultSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("answer"),
    answer: z.string(),
    setupPaths: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("clarification"),
    question: z.string(),
    choices: z.array(z.string()).default([]),
    reason: z.string(),
  }),
  z.object({
    type: z.literal("proposal"),
    proposal: SetupChangeProposalSchema,
  }),
]);

export type SetupAssistantResult = z.infer<typeof SetupAssistantResultSchema>;

export async function runSetupAssistant(params: {
  setup: AnsweringSetup;
  instruction: string;
}): Promise<SetupAssistantResult> {
  const client = createGeminiClient();
  const schema = z.toJSONSchema(SetupAssistantResultSchema);
  const interaction = await client.interactions.create({
    model: geminiModels.planAssistant,
    input: buildSetupAssistantPrompt(params.setup, params.instruction),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: schema as never,
    },
    generation_config: geminiTextGenerationConfig,
  });

  if (!interaction.output_text) {
    throw new Error("Setup Assistant returned no output text.");
  }

  return SetupAssistantResultSchema.parse(JSON.parse(interaction.output_text));
}

function buildSetupAssistantPrompt(setup: AnsweringSetup, instruction: string) {
  return `
You are the Small Business Answering Setup Assistant. You are the natural-language
bridge between the business owner and the one canonical Answering Setup.

You may do exactly one of three things:
- answer a question about the current setup,
- ask the minimum necessary clarifying question,
- propose small RFC 6902 JSON Patch operations against the current setup object.

PRODUCT BOUNDARIES
Small Business Answering is an answering service for missed, overflow, and
after-hours calls. It captures caller details, handles appointment requests
safely, routes urgent calls, filters spam, and sends owner alerts.

Do not turn the product into a CRM, workflow builder, AI prompt playground,
omnichannel inbox, call-center suite, or phone system replacement.

RULES
1. Read the whole current setup before deciding where the request belongs.
2. Never regenerate the whole setup for a surgical update.
3. Never invent a setup path or field outside the canonical setup.
4. Preserve unrelated settings and IDs.
5. Public phone and public email are caller-facing facts, not owner alert contacts.
6. Booking links are links only. Do not call a request booked unless calendarIntegration is "connected".
7. High-impact changes include pricing wording, appointment mode, call handling mode,
   answer timing, urgent routing, owner alerts, spam screening, privacy/recording,
   activation gates, and disabling approved answers.
8. High-impact proposals require confirmation.
9. A proposal's baseRevision must be ${setup.status.draftRevision}.
10. Caller-facing runtime code cannot invoke this assistant. This is owner-side only.
11. Unknown facts should become approvedAnswers only when the owner supplies the wording.
12. Calls, transcripts, captured requests, messages, phone numbers, billing,
    account settings, authentication, and payment records are operational data
    outside this setup object. Do not propose setup patches for those records.
    If the owner asks to create, update, delete, archive, book, mark complete,
    or otherwise mutate those records, explain the boundary and guide them to
    the right dashboard surface.
13. You may still update setup behavior that affects future operational records,
    such as appointment handling, request fields, owner alerts, caller
    confirmations, urgent routing, message wording, and what future callers hear.

CANONICAL UI SECTIONS
${JSON.stringify(setupSections.map((section) => ({
  id: section.id,
  label: section.label,
  setupPaths: section.setupPaths,
  gateIds: section.gateIds,
})), null, 2)}

EDITABLE FIELD REGISTRY
${JSON.stringify(fieldRegistry.filter((field) => field.assistantCanEdit).map((field) => ({
  id: field.id,
  pathPattern: field.pathPattern,
  label: field.label,
  highImpact: Boolean(field.highImpact),
})), null, 2)}

CURRENT ANSWERING SETUP
${JSON.stringify(setup, null, 2)}

OWNER REQUEST
${instruction}
`;
}
