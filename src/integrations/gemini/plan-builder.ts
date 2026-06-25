import { z } from "zod";
import { createGeminiClient, geminiModels, geminiTextGenerationConfig } from "./client";
import {
  AnsweringPlanDocumentSchema,
  FieldMetadataMapSchema,
} from "@/domain/answering-plan/schema";
import { assertPlanIntegrity } from "@/domain/answering-plan/integrity";
import { assembleWebsiteEvidenceIntoPlan } from "@/domain/answering-plan/import/assemble";
import {
  emptyWebsiteEvidenceBundle,
  WebsiteEvidenceBundleSchema,
  type WebsiteEvidenceBundle,
} from "@/domain/answering-plan/import/website-evidence";
import {
  assertGeminiSchemaCompatible,
  toGeminiJsonSchema,
} from "./schema-compatibility";

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
  const evidence = await extractWebsiteEvidence(params);
  const assembled = assembleWebsiteEvidenceIntoPlan({
    evidence,
    submittedUrl: params.submittedUrl,
    sourceDocuments: params.scrapedDocuments.map((document) => ({
      id: document.id,
      url: document.url,
      title: document.title,
    })),
  });

  const output = PlanBuilderOutputSchema.parse({
    document: assembled.document,
    fieldMetadata: assembled.fieldMetadata,
    unresolved: [
      ...assembled.unresolved,
      ...assembled.warnings.map((warning) => ({
        planPath: "/",
        reason: warning,
        candidateValues: [],
      })),
    ],
  });
  assertPlanIntegrity(output.document);
  return output;
}

async function extractWebsiteEvidence(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{
    id: string;
    url: string;
    title: string | null;
    text: string;
  }>;
}): Promise<WebsiteEvidenceBundle> {
  const schema = assertGeminiSchemaCompatible(toGeminiJsonSchema(WebsiteEvidenceBundleSchema));

  try {
    return await runEvidenceExtraction(params, schema);
  } catch (error) {
    if (!isSchemaRejectedError(error)) throw error;
    try {
      return await runEvidenceExtraction(params);
    } catch (fallbackError) {
      return emptyWebsiteEvidenceBundle(
        `Gemini website evidence extraction failed: ${
          fallbackError instanceof Error ? fallbackError.message : "Unknown error"
        }`,
      );
    }
  }
}

async function runEvidenceExtraction(
  params: {
    submittedUrl: string;
    scrapedDocuments: Array<{
      id: string;
      url: string;
      title: string | null;
      text: string;
    }>;
  },
  schema?: unknown,
): Promise<WebsiteEvidenceBundle> {
  const client = createGeminiClient();
  const interaction = await client.interactions.create({
    model: geminiModels.planBuilder,
    input: buildPrompt(params),
    response_format: {
      type: "text",
      mime_type: "application/json",
      ...(schema ? { schema: schema as never } : {}),
    },
    generation_config: geminiTextGenerationConfig,
  });

  if (!interaction.output_text) {
    throw new Error("Website Evidence Extractor returned no output text.");
  }

  return WebsiteEvidenceBundleSchema.parse(JSON.parse(interaction.output_text));
}

function buildPrompt(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{ id: string; url: string; title: string | null; text: string }>;
}) {
  return `
You are the Answerley Website Evidence Extractor.

Extract website-derived evidence that Answerley can later assemble into its
canonical Answering Plan. You are not writing the Answering Plan. Do not output
canonical plan JSON, JSON Pointer paths, final object IDs, fieldMetadata maps,
runtime instructions, dashboard configuration, or call-routing rules.

RULES
- Do not invent prices, hours, locations, policies, guarantees, availability,
  phone numbers, email addresses, booking links, or service coverage.
- Return facts, links, source evidence, conflicts, unresolved areas, and
  warnings only.
- Every extracted field must be supported by supplied pages.
- Use null for absent scalar values and [] for absent lists.
- Use sourceDocumentIds from the supplied document IDs exactly.
- Public phone numbers are public contact facts only. Do not treat them as
  owner alert recipients, transfer destinations, or routing contacts.
- Booking links are just links. Do not infer direct calendar integration.
- Pricing text must be copied conservatively. Do not parse or invent amounts.
- If values conflict, list the alternatives in evidence.conflictingValues and
  add an unresolved item.
- Keep sourceKey values stable, lowercase, and simple; they are temporary
  evidence keys, not final Answering Plan IDs.

SUBMITTED URL
${params.submittedUrl}

SCRAPED DOCUMENTS
${JSON.stringify(params.scrapedDocuments, null, 2)}
`;
}

function isSchemaRejectedError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /invalid argument|invalid_argument|schema|400/i.test(error.message);
}
