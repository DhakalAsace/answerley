import { NextResponse } from "next/server";
import { WebsiteScrapeOrchestrator } from "@/integrations/scraping/orchestrator";
import { buildAnsweringPlanFromScrape } from "@/integrations/gemini/plan-builder";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = String(body.url ?? "").trim();
    if (!url) throw new Error("Website URL is required.");
    const scrape = await new WebsiteScrapeOrchestrator().scrape(url);
    const plan =
      body.buildPlan && process.env.GEMINI_API_KEY
        ? await buildAnsweringPlanFromScrape({
            submittedUrl: scrape.normalizedUrl,
            scrapedDocuments: scrape.documents.map((document) => ({
              id: document.id,
              url: document.url,
              title: document.title,
              text: document.text,
            })),
          })
        : null;
    return NextResponse.json({ scrape, plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Website import failed." },
      { status: 400 },
    );
  }
}
