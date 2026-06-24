import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve("artifacts/screenshots");
await mkdir(output, { recursive: true });

async function fetchRenderedHtml(route) {
  const url = new URL(route, baseURL);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  let html = await response.text();

  const stylesheetPattern = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
  const matches = [...html.matchAll(stylesheetPattern)];
  const styles = [];
  for (const match of matches) {
    const cssUrl = new URL(match[1], baseURL);
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) throw new Error(`Failed to fetch stylesheet ${cssUrl}: ${cssResponse.status}`);
    styles.push(await cssResponse.text());
  }

  html = html
    .replace(stylesheetPattern, "")
    .replace(/<link[^>]+rel=["'](?:preload|modulepreload)["'][^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]+rel=["']icon["'][^>]*>/gi, "")
    .replace("</head>", `<style>${styles.join("\n")}</style></head>`);

  return html;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

const routes = [
  ["home", "/"],
  ["try-building", "/try?business=example.com&preview=building-complete"],
  ["try-testing", "/try?business=example.com&preview=testing-populated"],
  ["plan-lab", "/dev/answering-plan-lab"],
  ["contract-health", "/dev/contract-health"],
  ["calls", "/app/calls"],
  ["call-detail", "/app/calls/test-call"],
  ["answering-plan", "/app/answering-plan"],
];

for (const [name, route] of routes) {
  const html = await fetchRenderedHtml(route);
  await writeFile(path.join(output, `${name}.html`), html);
  for (const viewport of [
    { suffix: "desktop", width: 1440, height: 1000 },
    { suffix: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.screenshot({
      path: path.join(output, `${name}-${viewport.suffix}.png`),
      fullPage: true,
    });
    await page.close();
  }
}

await browser.close();
console.log(`Screenshots written to ${output}`);
