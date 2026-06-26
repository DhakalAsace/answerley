import { NextResponse } from "next/server";
import { WebsiteScrapeOrchestrator } from "@/integrations/scraping/orchestrator";
import { buildAnsweringPlanFromScrape } from "@/integrations/gemini/plan-builder";
import { buildAnsweringSetupFromScrape } from "@/integrations/gemini/setup-builder";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = String(body.url ?? "").trim();
    if (!url) throw new Error("Website URL is required.");
    const scrape = await new WebsiteScrapeOrchestrator().scrape(url);
    const scrapeInput = {
      submittedUrl: scrape.normalizedUrl,
      scrapedDocuments: scrape.documents.map((document) => ({
        id: document.id,
        url: document.url,
        title: document.title,
        text: document.text,
      })),
    };
    const setup = body.buildSetup || body.buildPlan
      ? await buildAnsweringSetupFromScrape(scrapeInput)
      : null;
    const plan = body.buildLegacyPlan || (body.buildPlan && body.buildLegacyPlan !== false)
      ? await buildAnsweringPlanFromScrape({
          submittedUrl: scrapeInput.submittedUrl,
          scrapedDocuments: scrapeInput.scrapedDocuments,
        })
      : null;
    return NextResponse.json({ scrape, setup, plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Website import failed." },
      { status: 400 },
    );
  }
}
