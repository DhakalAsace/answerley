import { buildSetupFromWebsiteEvidence } from "@/domain/small-business-answering/import/from-website-evidence";
import { extractWebsiteEvidence } from "./plan-builder";
import type { AnsweringSetup } from "@/domain/small-business-answering";
import { emptyWebsiteEvidenceBundle } from "@/domain/answering-plan/import/website-evidence";
import { isGeminiConfigured } from "./client";

export async function buildAnsweringSetupFromScrape(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{
    id: string;
    url: string;
    title: string | null;
    text: string;
  }>;
}): Promise<AnsweringSetup> {
  const evidence = isGeminiConfigured()
    ? await extractWebsiteEvidence(params)
    : emptyWebsiteEvidenceBundle(
        "Gemini is not configured, so this setup was created from safe defaults after scraping.",
      );
  return buildSetupFromWebsiteEvidence({
    evidence,
    submittedUrl: params.submittedUrl,
    sourceDocuments: params.scrapedDocuments.map((document) => ({
      id: document.id,
      url: document.url,
      title: document.title,
    })),
  });
}
