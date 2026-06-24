import { CheerioWebsiteScraper } from "./cheerio-scraper";
import type { WebsiteScrapeResult, WebsiteScraper } from "./types";

export type ContextFallbackAdapter = WebsiteScraper;

export class WebsiteScrapeOrchestrator {
  constructor(
    private readonly primary: WebsiteScraper = new CheerioWebsiteScraper(),
    private readonly fallback?: ContextFallbackAdapter,
  ) {}

  async scrape(url: string): Promise<WebsiteScrapeResult> {
    try {
      return await this.primary.scrape(url);
    } catch (primaryError) {
      if (!this.fallback) throw primaryError;
      const fallback = await this.fallback.scrape(url);
      return {
        ...fallback,
        warnings: [
          `Primary scraper failed: ${primaryError instanceof Error ? primaryError.message : "Unknown error"}`,
          ...fallback.warnings,
        ],
        providerAttempts: [this.primary.id, ...fallback.providerAttempts],
      };
    }
  }
}
