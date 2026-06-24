import { z } from "zod";
import { createGeminiClient, geminiModels, geminiTextGenerationConfig } from "./client";
import {
  AnsweringPlanDocumentSchema,
  FieldMetadataMapSchema,
} from "@/domain/answering-plan/schema";
import { assertPlanIntegrity } from "@/domain/answering-plan/integrity";
import { cloneFixturePlan } from "@/domain/answering-plan/fixtures";

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

const ExtractedWebsiteDraftSchema = z.object({
  businessName: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  businessType: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  contactUrl: z.string().nullable().default(null),
  address: z.object({
    line1: z.string().nullable().default(null),
    line2: z.string().nullable().default(null),
    city: z.string().nullable().default(null),
    region: z.string().nullable().default(null),
    postalCode: z.string().nullable().default(null),
    country: z.string().nullable().default(null),
  }).nullable().default(null),
  hoursSummary: z.string().nullable().default(null),
  offerings: z.array(z.object({
    name: z.string(),
    description: z.string().nullable().default(null),
    aliases: z.array(z.string()).default([]),
  })).default([]),
  knowledgeItems: z.array(z.object({
    title: z.string(),
    question: z.string(),
    answer: z.string(),
    type: z.enum(["faq", "policy"]).default("faq"),
  })).default([]),
  links: z.array(z.object({
    label: z.string(),
    type: z.enum(["booking", "contact", "pricing", "offering", "faq", "policy", "location", "payment", "custom"]).default("custom"),
    url: z.string(),
    description: z.string().nullable().default(null),
  })).default([]),
  unresolved: z.array(z.object({
    planPath: z.string(),
    reason: z.string(),
    candidateValues: z.array(z.unknown()).default([]),
  })).default([]),
});

type ExtractedWebsiteDraft = z.infer<typeof ExtractedWebsiteDraftSchema>;

export async function buildAnsweringPlanFromScrape(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{
    id: string;
    url: string;
    title: string | null;
    text: string;
  }>;
}): Promise<PlanBuilderOutput> {
  const draft = await extractWebsiteDraft(params).catch(() => buildFallbackDraft(params));
  const output = buildCanonicalPlanOutput(params, draft);
  assertPlanIntegrity(output.document);
  return output;
}

async function extractWebsiteDraft(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{
    id: string;
    url: string;
    title: string | null;
    text: string;
  }>;
}) {
  const client = createGeminiClient();
  const interaction = await client.interactions.create({
    model: geminiModels.planBuilder,
    input: buildExtractionPrompt(params),
    response_format: {
      type: "text",
      mime_type: "application/json",
    },
    generation_config: geminiTextGenerationConfig,
  });

  if (!interaction.output_text) {
    throw new Error("Website Plan Builder returned no output text.");
  }

  return ExtractedWebsiteDraftSchema.parse(parseGeminiJson(interaction.output_text));
}

function buildExtractionPrompt(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{ id: string; url: string; title: string | null; text: string }>;
}) {
  const documents = params.scrapedDocuments.map((document) => ({
    ...document,
    text: document.text.slice(0, 12_000),
  }));
  return `
You are the Answerley Website Fact Extractor.

Extract only caller-facing business facts from the supplied website text.
The application will convert your extracted facts into the canonical
Answering Plan. Do not produce the full Answering Plan schema.

RULES
- Do not invent prices, hours, locations, policies, guarantees, availability,
  phone numbers, email addresses, booking links, or service coverage.
- Return only one valid JSON object with this top-level shape:
  {
    "businessName": string|null,
    "description": string|null,
    "businessType": string|null,
    "phone": string|null,
    "email": string|null,
    "contactUrl": string|null,
    "address": {"line1": string|null, "line2": string|null, "city": string|null, "region": string|null, "postalCode": string|null, "country": string|null}|null,
    "hoursSummary": string|null,
    "offerings": [{"name": string, "description": string|null, "aliases": string[]}],
    "knowledgeItems": [{"title": string, "question": string, "answer": string, "type": "faq"|"policy"}],
    "links": [{"label": string, "type": "booking"|"contact"|"pricing"|"offering"|"faq"|"policy"|"location"|"payment"|"custom", "url": string, "description": string|null}],
    "unresolved": [{"planPath": string, "reason": string, "candidateValues": []}]
  }
- Do not wrap the JSON in Markdown fences or explanatory prose.

SUBMITTED URL
${params.submittedUrl}

SCRAPED DOCUMENTS
${JSON.stringify(documents, null, 2)}
`;
}

function buildCanonicalPlanOutput(
  params: {
    submittedUrl: string;
    scrapedDocuments: Array<{ id: string; url: string; title: string | null; text: string }>;
  },
  draft: ExtractedWebsiteDraft,
): PlanBuilderOutput {
  const now = new Date().toISOString();
  const firstDocument = params.scrapedDocuments[0];
  const businessName =
    cleanNullable(draft.businessName) ??
    cleanNullable(firstDocument?.title) ??
    new URL(params.submittedUrl).hostname.replace(/^www\./, "");
  const description =
    cleanNullable(draft.description) ??
    cleanNullable(firstDocument?.text.slice(0, 240)) ??
    null;
  const email = validEmail(draft.email);
  const contactUrl = validUrl(draft.contactUrl) ?? params.submittedUrl;
  const base = cloneFixturePlan().document;
  const offeringInputs = draft.offerings.length
    ? draft.offerings.slice(0, 6)
    : [{ name: "General inquiry", description, aliases: [] }];
  const offerings = offeringInputs.map((offering, index) => ({
    ...base.offerings[0],
    id: `offering_${slugify(offering.name || `service_${index + 1}`)}`,
    enabled: true,
    name: offering.name || `Service ${index + 1}`,
    title: offering.name || `Service ${index + 1}`,
    description: cleanNullable(offering.description),
    aliases: offering.aliases.slice(0, 6),
    bookable: false,
    canSendBookingLink: false,
    requestTypeId: "request_consultation",
    linkIds: [],
  }));
  const links = buildLinks(params.submittedUrl, contactUrl, draft.links);
  const knowledgeItems = buildKnowledgeItems(draft, description);

  const document = AnsweringPlanDocumentSchema.parse({
    ...base,
    businessProfile: {
      ...base.businessProfile,
      businessName,
      legalName: null,
      websiteUrl: params.submittedUrl,
      businessType: {
        label: cleanNullable(draft.businessType) ?? "Business",
        description: null,
        aliases: [],
      },
      description,
      timezone: null,
      publicContact: {
        phone: cleanNullable(draft.phone),
        email,
        contactUrl,
      },
      address: {
        line1: cleanNullable(draft.address?.line1),
        line2: cleanNullable(draft.address?.line2),
        city: cleanNullable(draft.address?.city),
        region: cleanNullable(draft.address?.region),
        postalCode: cleanNullable(draft.address?.postalCode),
        country: cleanNullable(draft.address?.country),
      },
      businessNamePronunciation: businessName,
    },
    temporaryUpdates: [],
    offerings,
    hoursAvailability: {
      ...base.hoursAvailability,
      enabled: Boolean(cleanNullable(draft.hoursSummary)),
      timezone: null,
      regularHours: closedWeek(),
      specialDates: [],
      availabilityNotes: cleanNullable(draft.hoursSummary),
    },
    locationsCoverage: {
      ...base.locationsCoverage,
      enabled: Boolean(draft.address || draft.phone || email),
      locations: [
        {
          ...base.locationsCoverage.locations[0],
          name: businessName,
          description: description ?? null,
          address: {
            line1: cleanNullable(draft.address?.line1),
            line2: cleanNullable(draft.address?.line2),
            city: cleanNullable(draft.address?.city),
            region: cleanNullable(draft.address?.region),
            postalCode: cleanNullable(draft.address?.postalCode),
            country: cleanNullable(draft.address?.country),
          },
          phone: cleanNullable(draft.phone),
          email,
          offeringIds: offerings.map((offering) => offering.id),
          bookingLinkId: null,
        },
      ],
      serviceAreas: [],
      callerFacingDescription: description,
    },
    knowledgeItems,
    links,
    booking: {
      ...base.booking,
      enabled: false,
      defaultMethod: "none",
      bookingLinkId: null,
      integrationConnectionId: null,
      defaultIntakeFieldIds: [],
      confirmationWording: null,
      offeringOverrides: [],
    },
    greetingVoice: {
      ...base.greetingVoice,
      openingGreeting: `Thanks for calling ${businessName}. How can I help today?`,
      businessNamePronunciation: businessName,
      voicePreviewText: `Thanks for calling ${businessName}. How can I help today?`,
    },
    routing: {
      ...base.routing,
      contacts: [
        {
          ...base.routing.contacts[0],
          name: "Primary business contact",
          phone: cleanNullable(draft.phone),
          email,
        },
      ],
    },
    unknownHandling: {
      ...base.unknownHandling,
      callerWording: "I do not have that information confirmed, but I can take your details and have the team follow up.",
    },
  });

  return PlanBuilderOutputSchema.parse({
    document,
    fieldMetadata: buildFieldMetadata(params, draft, now),
    unresolved: draft.unresolved,
  });
}

function buildFallbackDraft(params: {
  submittedUrl: string;
  scrapedDocuments: Array<{ id: string; url: string; title: string | null; text: string }>;
}): ExtractedWebsiteDraft {
  const firstDocument = params.scrapedDocuments[0];
  const description = cleanNullable(firstDocument?.text.slice(0, 280));
  return {
    businessName: cleanNullable(firstDocument?.title) ?? new URL(params.submittedUrl).hostname.replace(/^www\./, ""),
    description,
    businessType: null,
    phone: null,
    email: null,
    contactUrl: params.submittedUrl,
    address: null,
    hoursSummary: null,
    offerings: [],
    knowledgeItems: description
      ? [{
          title: "Website information",
          question: "What information is available on the website?",
          answer: description,
          type: "faq",
        }]
      : [],
    links: [],
    unresolved: [
      {
        planPath: "/businessProfile",
        reason: "Only limited website text could be converted automatically.",
        candidateValues: [],
      },
    ],
  };
}

function buildKnowledgeItems(draft: ExtractedWebsiteDraft, description: string | null) {
  const items = draft.knowledgeItems.slice(0, 10).map((item, index) => ({
    id: `knowledge_${slugify(item.title || `item_${index + 1}`)}`,
    enabled: true,
    type: item.type,
    title: item.title || `Website fact ${index + 1}`,
    question: item.question || item.title || "What should callers know?",
    alternativeQuestions: [] as string[],
    answer: item.answer,
    behavior: { mode: "answer_directly" as const, linkId: null, routingRuleId: null },
    appliesTo: { offeringIds: [] as string[], locationIds: [] as string[] },
    internalNotes: null,
  }));
  if (draft.hoursSummary) {
    items.unshift({
      id: "knowledge_hours",
      enabled: true,
      type: "faq" as const,
      title: "Business hours",
      question: "What are your hours?",
      alternativeQuestions: ["When are you open?"],
      answer: draft.hoursSummary,
      behavior: { mode: "answer_directly" as const, linkId: null, routingRuleId: null },
      appliesTo: { offeringIds: [], locationIds: [] },
      internalNotes: null,
    });
  }
  if (!items.length && description) {
    items.push({
      id: "knowledge_website_summary",
      enabled: true,
      type: "faq" as const,
      title: "Website summary",
      question: "What does the business say on its website?",
      alternativeQuestions: [],
      answer: description,
      behavior: { mode: "answer_directly" as const, linkId: null, routingRuleId: null },
      appliesTo: { offeringIds: [], locationIds: [] },
      internalNotes: null,
    });
  }
  return items;
}

function buildLinks(submittedUrl: string, contactUrl: string, extractedLinks: ExtractedWebsiteDraft["links"]) {
  const validExtracted = extractedLinks
    .filter((link) => validUrl(link.url))
    .slice(0, 8)
    .map((link, index) => ({
      id: `link_${slugify(link.label || `resource_${index + 1}`)}`,
      enabled: true,
      label: link.label || `Website resource ${index + 1}`,
      type: link.type,
      url: link.url,
      description: cleanNullable(link.description),
    }));
  return [
    {
      id: "link_booking",
      enabled: false,
      label: "Website",
      type: "custom" as const,
      url: submittedUrl,
      description: "Main website.",
    },
    {
      id: "link_contact",
      enabled: true,
      label: "Contact",
      type: "contact" as const,
      url: contactUrl,
      description: "Contact page or main website.",
    },
    ...validExtracted.filter((link) => !["link_booking", "link_contact"].includes(link.id)),
  ];
}

function buildFieldMetadata(
  params: { scrapedDocuments: Array<{ id: string; url: string; title: string | null; text: string }> },
  draft: ExtractedWebsiteDraft,
  now: string,
) {
  const sourceDocument = params.scrapedDocuments[0];
  const source = {
    sourceType: "website" as const,
    sourceDocumentId: sourceDocument?.id ?? null,
    sourceUrl: sourceDocument?.url ?? null,
    sourceLabel: sourceDocument?.title ?? "Website",
    excerpt: cleanNullable(sourceDocument?.text.slice(0, 240)),
    observedAt: now,
  };
  return FieldMetadataMapSchema.parse({
    "/businessProfile/businessName": {
      sourceType: draft.businessName ? "website" : "answerley_default",
      sources: draft.businessName ? [source] : [],
      confidence: draft.businessName ? 0.86 : null,
      confirmedByUser: false,
      confirmedAt: null,
      lastChangedBy: "website_builder",
      lastChangedAt: now,
      conflicts: [],
      note: null,
    },
    "/businessProfile/description": {
      sourceType: draft.description ? "website" : "answerley_default",
      sources: draft.description ? [source] : [],
      confidence: draft.description ? 0.78 : null,
      confirmedByUser: false,
      confirmedAt: null,
      lastChangedBy: "website_builder",
      lastChangedAt: now,
      conflicts: [],
      note: null,
    },
  });
}

function closedWeek() {
  const day = { open: false, periods: [], note: null };
  return {
    monday: day,
    tuesday: day,
    wednesday: day,
    thursday: day,
    friday: day,
    saturday: day,
    sunday: day,
  };
}

function validEmail(value: string | null | undefined) {
  const clean = cleanNullable(value);
  if (!clean) return null;
  return z.string().email().safeParse(clean).success ? clean : null;
}

function validUrl(value: string | null | undefined) {
  const clean = cleanNullable(value);
  if (!clean) return null;
  return z.string().url().safeParse(clean).success ? clean : null;
}

function cleanNullable(value: string | null | undefined) {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean || null;
}

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "item";
}

function parseGeminiJson(outputText: string) {
  try {
    return JSON.parse(outputText);
  } catch {
    const fenced = outputText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const start = outputText.indexOf("{");
    const end = outputText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(outputText.slice(start, end + 1));
    }
    throw new Error("Website Plan Builder returned non-JSON output.");
  }
}
