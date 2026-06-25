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
