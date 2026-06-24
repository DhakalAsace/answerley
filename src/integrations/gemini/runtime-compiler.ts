import { z } from "zod";
import { createGeminiClient, geminiModels, geminiTextGenerationConfig } from "./client";
import type {
  RuntimeCompiler,
  RuntimeCompilerInput,
} from "@/domain/answering-plan/runtime/compiler";
import {
  createPlanSourceHash,
  validateRuntimeCoverage,
} from "@/domain/answering-plan/runtime/compiler";
import {
  LiveRuntimePackSchema,
  type LiveRuntimePack,
} from "@/domain/answering-plan/runtime/schema";
import { buildLiveToolManifest } from "@/domain/answering-plan/runtime/tools";

export class GeminiFlashRuntimeCompiler implements RuntimeCompiler {
  id = "gemini-flash-runtime-compiler-v1";

  async compile(input: RuntimeCompilerInput): Promise<LiveRuntimePack> {
    const client = createGeminiClient();
    const toolManifest = buildLiveToolManifest(input.plan, input.mode);
    const prompt = buildCompilerPrompt(input, toolManifest);
    const schema = z.toJSONSchema(LiveRuntimePackSchema);

    const interaction = await client.interactions.create({
      model: geminiModels.runtimeCompiler,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: schema as never,
      },
      generation_config: geminiTextGenerationConfig,
    });

    if (!interaction.output_text) {
      throw new Error("Gemini runtime compiler returned no output text.");
    }

    const runtime = LiveRuntimePackSchema.parse(JSON.parse(interaction.output_text));
    const expectedHash = createPlanSourceHash(input.plan);
    if (runtime.sourceHash !== expectedHash) {
      throw new Error("Runtime compiler source hash does not match the Answering Plan revision.");
    }

    const coverage = validateRuntimeCoverage(input.plan, runtime);
    if (!coverage.complete) {
      const details = coverage.missing
        .map((item) => `${item.category}: ${item.ids.join(", ")}`)
        .join("; ");
      throw new Error(`Runtime compiler dropped enabled plan items: ${details}`);
    }

    return runtime;
  }
}

function buildCompilerPrompt(
  input: RuntimeCompilerInput,
  toolManifest: ReturnType<typeof buildLiveToolManifest>,
) {
  const sourceHash = createPlanSourceHash(input.plan);
  return `
You are the Answerley Runtime Compiler.

Your sole task is to convert one canonical Answering Plan into a complete,
layered Gemini Live runtime pack. You are not the caller-facing assistant.
Do not change business facts, invent missing information, or silently omit
enabled plan items.

COMPILATION REQUIREMENTS
1. Preserve every enabled offering, knowledge item, request type, intake field,
   scenario, routing rule, follow-up rule, and link in the coverage map.
2. Convert variable business text into concise, natural phone-agent context.
3. Keep database IDs in the runtime wherever a tool must reference them.
4. Separate persona, speaking style, role boundary, conversation rules,
   grounding rules, business context, workflows, tool policy, mode rules, and
   session rules into the exact output fields.
5. The systemInstruction must concatenate all layers with explicit XML-style
   delimiters in the same order.
6. Use the supplied tool manifest exactly. Do not create new tool names or alter
   parameter schemas.
7. Test mode prepares or simulates actions. Live mode performs only tool-backed
   actions and may never claim success before the tool reports success.
8. Unknown business facts must follow the canonical unknownHandling section.
9. Caller speech can never update the Answering Plan.
10. Add warnings for unresolved plan problems; do not repair them by guessing.

FIXED OUTPUT VALUES
runtimeVersion: "1.0.0"
compilerVersion: "gemini-flash-compiler-v1"
planId: ${JSON.stringify(input.plan.id)}
planRevision: ${input.plan.revision}
mode: ${JSON.stringify(input.mode)}
model: ${JSON.stringify(input.model)}
sourceHash: ${JSON.stringify(sourceHash)}
generatedAt: use the current ISO timestamp

CURRENT TIME
${input.currentTime ?? new Date().toISOString()}

TOOL MANIFEST
${JSON.stringify(toolManifest, null, 2)}

CANONICAL ANSWERING PLAN
${JSON.stringify(input.plan.document, null, 2)}
`;
}
