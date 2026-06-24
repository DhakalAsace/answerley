import { z } from "zod";
import { createGeminiClient, geminiModels, geminiTextGenerationConfig } from "./client";
import {
  AnsweringPlanDocumentSchema,
  FieldMetadataMapSchema,
} from "@/domain/answering-plan/schema";
import { assertPlanIntegrity } from "@/domain/answering-plan/integrity";

const PlanBuilderOutputSchema = z.object({
  document: AnsweringPlanDocumentSchema,
  fieldMetadata: FieldMetadataMapSchema,
  unresolved: z.array(
    z.object({
      planPath: z.string(),
      reason: z.string(),
      candidateValues: z.array(z.unknown()).default([]),
    }),
  ).default([]),
});

export type PlanBuilderOutput = z.infer<typeof PlanBuilderOutputSchema>;

export async function buildAnsweringPlanFromScrape(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{
    id: string;
    url: string;
    title: string | null;
    text: string;
  }>;
}): Promise<PlanBuilderOutput> {
  const client = createGeminiClient();
  const schema = z.toJSONSchema(PlanBuilderOutputSchema);
  const interaction = await client.interactions.create({
    model: geminiModels.planBuilder,
    input: buildPrompt(params),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: schema as never,
    },
    generation_config: geminiTextGenerationConfig,
  });

  if (!interaction.output_text) {
    throw new Error("Website Plan Builder returned no output text.");
  }

  const output = PlanBuilderOutputSchema.parse(JSON.parse(interaction.output_text));
  assertPlanIntegrity(output.document);
  return output;
}

function buildPrompt(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{ id: string; url: string; title: string | null; text: string }>;
}) {
  return `
You are the Answerley Website Plan Builder.

Convert the supplied website extraction into one complete Answering Plan v1.
Populate factual business information only when supported by the supplied
pages. Create conservative recommended behavior defaults where the schema
expects configuration, and label those values in fieldMetadata as
answerley_default or assistant rather than website facts.

RULES
- Do not invent prices, hours, locations, policies, guarantees, availability,
  phone numbers, email addresses, booking links, or service coverage.
- Use null, empty arrays, disabled modes, and unresolved items when information
  is absent.
- Business type may improve defaults but must not create vertical-specific
  fields outside the canonical schema.
- Create generic request types, intake fields, scenarios, follow-ups, unknown
  handling, and greeting defaults that fit the discovered business.
- Source metadata paths use JSON Pointer syntax.
- Each website-derived value must cite the matching source document ID and URL.
- Conflicting source values must be preserved in metadata.conflicts and added
  to unresolved.
- Output schemaVersion "1.0.0".

SUBMITTED URL
${params.submittedUrl}

SCRAPED DOCUMENTS
${JSON.stringify(params.scrapedDocuments, null, 2)}
`;
}
