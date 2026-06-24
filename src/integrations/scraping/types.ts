export interface ScrapedDocument {
  id: string;
  url: string;
  title: string | null;
  text: string;
  fetchedAt: string;
  provider: string;
}

export interface WebsiteScrapeResult {
  submittedUrl: string;
  normalizedUrl: string;
  documents: ScrapedDocument[];
  warnings: string[];
  providerAttempts: string[];
}

export interface WebsiteScraper {
  id: string;
  scrape(url: string): Promise<WebsiteScrapeResult>;
}
