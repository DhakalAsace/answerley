import { z } from "zod";

const NullableStringSchema = z.union([z.string(), z.null()]);
const NullableNumberSchema = z.union([z.number(), z.null()]);

export const EvidenceAddressSchema = z.object({
  line1: NullableStringSchema,
  city: NullableStringSchema,
  region: NullableStringSchema,
  postalCode: NullableStringSchema,
  country: NullableStringSchema,
});

export const WebsiteEvidenceBundleSchema = z.object({
  business: z.object({
    name: NullableStringSchema,
    websiteUrl: NullableStringSchema,
    businessType: NullableStringSchema,
    shortDescription: NullableStringSchema,
    timezone: NullableStringSchema,
    primaryLanguage: NullableStringSchema,
    publicPhone: NullableStringSchema,
    publicEmail: NullableStringSchema,
    address: z.union([EvidenceAddressSchema, z.null()]),
  }),
  offerings: z.array(
    z.object({
      sourceKey: z.string(),
      name: z.string(),
      description: z.string(),
      aliases: z.array(z.string()),
      pricingText: NullableStringSchema,
      bookingLinkUrl: NullableStringSchema,
    }),
  ),
  weeklyHours: z.array(
    z.object({
      day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
      closed: z.boolean(),
      periods: z.array(
        z.object({
          open: z.string(),
          close: z.string(),
        }),
      ),
      note: NullableStringSchema,
    }),
  ),
  locations: z.array(
    z.object({
      sourceKey: z.string(),
      name: z.string(),
      addressText: NullableStringSchema,
      phone: NullableStringSchema,
      email: NullableStringSchema,
    }),
  ),
  coverage: z.object({
    modeHint: NullableStringSchema,
    description: NullableStringSchema,
    cities: z.array(z.string()),
    regions: z.array(z.string()),
    postalCodes: z.array(z.string()),
  }),
  knowledgeItems: z.array(
    z.object({
      sourceKey: z.string(),
      type: z.enum(["faq", "policy", "instruction"]),
      title: z.string(),
      question: z.string(),
      answer: z.string(),
      relatedUrl: NullableStringSchema,
    }),
  ),
  links: z.array(
    z.object({
      sourceKey: z.string(),
      type: z.enum(["booking", "contact", "pricing", "offering", "faq", "policy", "location", "payment", "custom"]),
      label: z.string(),
      url: z.string(),
    }),
  ),
  evidence: z.array(
    z.object({
      entityType: z.enum([
        "business",
        "offering",
        "hours",
        "location",
        "coverage",
        "knowledge",
        "link",
      ]),
      entityKey: z.string(),
      field: z.string(),
      sourceDocumentIds: z.array(z.string()),
      sourceUrl: NullableStringSchema,
      confidence: NullableNumberSchema,
      conflictingValues: z.array(z.string()),
      excerpt: NullableStringSchema,
    }),
  ),
  unresolved: z.array(
    z.object({
      area: z.string(),
      reason: z.string(),
    }),
  ),
  warnings: z.array(z.string()),
});

export type WebsiteEvidenceBundle = z.infer<typeof WebsiteEvidenceBundleSchema>;

export function parseWebsiteEvidenceBundle(input: unknown): WebsiteEvidenceBundle {
  return WebsiteEvidenceBundleSchema.parse(normalizeWebsiteEvidenceInput(input));
}

export function emptyWebsiteEvidenceBundle(warning?: string): WebsiteEvidenceBundle {
  return {
    business: {
      name: null,
      websiteUrl: null,
      businessType: null,
      shortDescription: null,
      timezone: null,
      primaryLanguage: null,
      publicPhone: null,
      publicEmail: null,
      address: null,
    },
    offerings: [],
    weeklyHours: [],
    locations: [],
    coverage: {
      modeHint: null,
      description: null,
      cities: [],
      regions: [],
      postalCodes: [],
    },
    knowledgeItems: [],
    links: [],
    evidence: [],
    unresolved: warning ? [{ area: "website_evidence", reason: warning }] : [],
    warnings: warning ? [warning] : [],
  };
}

function normalizeWebsiteEvidenceInput(input: unknown): unknown {
  if (!isRecord(input)) return input;

  const normalized = { ...input };

  normalized.business = normalizeBusiness(normalized.business);
  normalized.coverage = normalizeCoverage(normalized.coverage);
  normalized.offerings = asArray(normalized.offerings).map(normalizeOffering);
  normalized.weeklyHours = asArray(normalized.weeklyHours).map(normalizeWeeklyHours);
  normalized.locations = asArray(normalized.locations).map(normalizeLocation);
  normalized.knowledgeItems = asArray(normalized.knowledgeItems).map(normalizeKnowledgeItem);
  normalized.links = asArray(normalized.links);
  normalized.evidence = asArray(normalized.evidence).map(normalizeEvidence);
  normalized.unresolved = asArray(normalized.unresolved);
  normalized.warnings = asArray(normalized.warnings);

  return normalized;
}

function normalizeBusiness(input: unknown): unknown {
  const business = isRecord(input) ? { ...input } : {};
  for (const key of [
    "name",
    "websiteUrl",
    "businessType",
    "shortDescription",
    "timezone",
    "primaryLanguage",
    "publicPhone",
    "publicEmail",
  ]) {
    if (business[key] === undefined) business[key] = null;
  }

  if (business.address === undefined) {
    business.address = null;
  } else if (isRecord(business.address)) {
    business.address = normalizeAddress(business.address);
  }

  return business;
}

function normalizeAddress(input: Record<string, unknown>): unknown {
  const address = { ...input };
  for (const key of ["line1", "city", "region", "postalCode", "country"]) {
    if (address[key] === undefined) address[key] = null;
  }
  return address;
}

function normalizeCoverage(input: unknown): unknown {
  const coverage = isRecord(input) ? { ...input } : {};
  if (coverage.modeHint === undefined) coverage.modeHint = null;
  if (coverage.description === undefined) coverage.description = null;
  coverage.cities = asArray(coverage.cities);
  coverage.regions = asArray(coverage.regions);
  coverage.postalCodes = asArray(coverage.postalCodes);
  return coverage;
}

function normalizeOffering(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    aliases: asArray(input.aliases),
    pricingText: input.pricingText === undefined ? null : input.pricingText,
    bookingLinkUrl: input.bookingLinkUrl === undefined ? null : input.bookingLinkUrl,
  };
}

function normalizeWeeklyHours(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    periods: asArray(input.periods),
    note: input.note === undefined ? null : input.note,
  };
}

function normalizeLocation(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    addressText: input.addressText === undefined ? null : input.addressText,
    phone: input.phone === undefined ? null : input.phone,
    email: input.email === undefined ? null : input.email,
  };
}

function normalizeKnowledgeItem(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    relatedUrl: input.relatedUrl === undefined ? null : input.relatedUrl,
  };
}

function normalizeEvidence(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    sourceDocumentIds: asArray(input.sourceDocumentIds),
    sourceUrl: input.sourceUrl === undefined ? null : input.sourceUrl,
    confidence: input.confidence === undefined ? null : input.confidence,
    conflictingValues: asArray(input.conflictingValues),
    excerpt: input.excerpt === undefined ? null : input.excerpt,
  };
}

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
