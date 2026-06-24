import * as cheerio from "cheerio";
import type {
  ScrapedDocument,
  WebsiteScrapeResult,
  WebsiteScraper,
} from "./types";

const DEFAULT_PATH_HINTS = [
  "about",
  "services",
  "products",
  "pricing",
  "contact",
  "faq",
  "faqs",
  "book",
  "booking",
  "appointments",
  "policies",
  "locations",
  "hours",
];

export class CheerioWebsiteScraper implements WebsiteScraper {
  id = "cheerio";

  constructor(
    private readonly options: {
      maxPages?: number;
      maxCharactersPerPage?: number;
      timeoutMs?: number;
    } = {},
  ) {}

  async scrape(input: string): Promise<WebsiteScrapeResult> {
    const normalizedUrl = normalizeWebsiteUrl(input);
    const root = new URL(normalizedUrl);
    const maxPages = this.options.maxPages ?? 8;
    const queue = [normalizedUrl];
    const seen = new Set<string>();
    const documents: ScrapedDocument[] = [];
    const warnings: string[] = [];

    while (queue.length && documents.length < maxPages) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);

      try {
        const html = await fetchHtml(current, this.options.timeoutMs ?? 12_000);
        const $ = cheerio.load(html);
        $("script, style, noscript, svg, canvas, iframe").remove();
        const title = cleanText($("title").first().text()) || null;
        const main = $("main").text() || $("body").text();
        const text = cleanText(main).slice(0, this.options.maxCharactersPerPage ?? 50_000);
        if (text.length < 80) {
          warnings.push(`Very little readable content was found at ${current}.`);
        }
        documents.push({
          id: `source_${documents.length + 1}`,
          url: current,
          title,
          text,
          fetchedAt: new Date().toISOString(),
          provider: this.id,
        });

        const discovered = discoverUsefulLinks($, root, current);
        for (const url of discovered) {
          if (!seen.has(url) && !queue.includes(url)) queue.push(url);
        }
      } catch (error) {
        warnings.push(
          `Could not read ${current}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    if (!documents.length) {
      throw new Error("No readable website pages could be extracted.");
    }

    return {
      submittedUrl: input,
      normalizedUrl,
      documents,
      warnings,
      providerAttempts: [this.id],
    };
  }
}

function normalizeWebsiteUrl(input: string) {
  const trimmed = input.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites are supported.");
  }
  url.hash = "";
  return url.toString();
}

async function fetchHtml(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AnswerleyBusinessImporter/1.0; +https://answerley.example)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function discoverUsefulLinks(
  $: cheerio.CheerioAPI,
  root: URL,
  current: string,
) {
  const scored = new Map<string, number>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, current);
      if (url.origin !== root.origin) return;
      url.hash = "";
      if (/\.(pdf|jpg|jpeg|png|gif|webp|zip|docx?)$/i.test(url.pathname)) return;
      const key = url.toString();
      const haystack = `${url.pathname} ${cleanText($(element).text())}`.toLowerCase();
      const score = DEFAULT_PATH_HINTS.reduce(
        (sum, hint) => sum + (haystack.includes(hint) ? 2 : 0),
        url.pathname === root.pathname ? 1 : 0,
      );
      if (score > 0) scored.set(key, Math.max(score, scored.get(key) ?? 0));
    } catch {
      // Ignore malformed links.
    }
  });
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([url]) => url);
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
