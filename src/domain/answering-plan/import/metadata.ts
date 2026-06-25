import type {
  FieldMetadataMap,
  SourceTypeSchema,
} from "@/domain/answering-plan/schema";
import type { z } from "zod";
import type { WebsiteEvidenceBundle } from "./website-evidence";

type SourceType = z.infer<typeof SourceTypeSchema>;

export interface SourceDocumentSummary {
  id: string;
  url: string;
  title: string | null;
}

type EvidenceEntry = WebsiteEvidenceBundle["evidence"][number];

function changedByForSourceType(sourceType: SourceType) {
  if (sourceType === "assistant") return "plan_assistant";
  if (sourceType === "integration") return "integration";
  if (sourceType === "system") return "system";
  return "website_builder";
}

export function defaultMetadata(
  sourceType: SourceType,
  note: string,
  observedAt: string,
  confidence: number | null = null,
): FieldMetadataMap[string] {
  return {
    sourceType,
    sources: [],
    confidence,
    confirmedByUser: false,
    confirmedAt: null,
    lastChangedBy: changedByForSourceType(sourceType),
    lastChangedAt: observedAt,
    conflicts: [],
    note,
  };
}

export function websiteMetadata(
  evidence: EvidenceEntry | undefined,
  sourceDocuments: SourceDocumentSummary[],
  observedAt: string,
  note: string | null = null,
): FieldMetadataMap[string] {
  const sources: FieldMetadataMap[string]["sources"] = (evidence?.sourceDocumentIds ?? [])
    .map((sourceDocumentId) => {
      const sourceDocument = sourceDocuments.find((item) => item.id === sourceDocumentId);
      return {
        sourceType: "website" as const,
        sourceDocumentId,
        sourceUrl: evidence?.sourceUrl ?? sourceDocument?.url ?? null,
        sourceLabel: sourceDocument?.title ?? null,
        excerpt: evidence?.excerpt ?? null,
        observedAt,
      };
    });

  const fallbackSourceUrl = evidence?.sourceUrl ?? null;
  if (!sources.length && fallbackSourceUrl) {
    sources.push({
      sourceType: "website",
      sourceDocumentId: null,
      sourceUrl: fallbackSourceUrl,
      sourceLabel: null,
      excerpt: evidence?.excerpt ?? null,
      observedAt,
    });
  }

  const conflictSource = sources[0] ?? {
    sourceType: "website" as const,
    sourceDocumentId: null,
    sourceUrl: fallbackSourceUrl,
    sourceLabel: null,
    excerpt: null,
    observedAt,
  };

  return {
    sourceType: "website",
    sources,
    confidence: evidence?.confidence ?? null,
    confirmedByUser: false,
    confirmedAt: null,
    lastChangedBy: "website_builder",
    lastChangedAt: observedAt,
    conflicts: (evidence?.conflictingValues ?? []).map((value) => ({
      value,
      source: conflictSource,
      note: "Conflicting website value reported during import.",
    })),
    note,
  };
}

export function findEvidence(
  bundle: WebsiteEvidenceBundle,
  entityType: EvidenceEntry["entityType"],
  entityKey: string,
  field: string,
) {
  const matches = bundle.evidence.filter(
    (item) =>
      item.entityType === entityType &&
      item.entityKey === entityKey &&
      item.field === field,
  );
  return matches.find((item) => item.conflictingValues.length > 0) ?? matches[0];
}
