import { describe, expect, it } from "vitest";
import { z } from "zod";
import { assertPlanIntegrity } from "../integrity";
import { calculatePlanReadiness } from "../readiness";
import {
  AnsweringPlanDocumentSchema,
  FieldMetadataMapSchema,
} from "../schema";
import { FoundationPreviewRuntimeCompiler } from "../runtime/compiler";
import { assembleWebsiteEvidenceIntoPlan } from "../import/assemble";
import {
  emptyWebsiteEvidenceBundle,
  parseWebsiteEvidenceBundle,
  type WebsiteEvidenceBundle,
} from "../import/website-evidence";
import {
  assertGeminiSchemaCompatible,
  toGeminiJsonSchema,
  GeminiSchemaCompatibilityError,
} from "@/integrations/gemini/schema-compatibility";
import { WebsiteEvidenceBundleSchema } from "../import/website-evidence";

const sourceDocuments = [
  {
    id: "source_1",
    url: "https://example.com",
    title: "Example business",
  },
  {
    id: "source_2",
    url: "https://example.com/services",
    title: "Services",
  },
];

function evidence(): WebsiteEvidenceBundle {
  return {
    business: {
      name: "Northstar Repairs",
      websiteUrl: "https://example.com",
      businessType: "Repair service",
      shortDescription: "Northstar Repairs handles repair consultations and support requests.",
      timezone: "America/Chicago",
      primaryLanguage: "en",
      publicPhone: "+1 555 0100",
      publicEmail: "hello@example.com",
      address: {
        line1: "12 Main Street",
        city: "Austin",
        region: "Texas",
        postalCode: "78701",
        country: "United States",
      },
    },
    offerings: [
      {
        sourceKey: "emergency_repair",
        name: "Emergency repair",
        description: "Fast repair help for urgent issues.",
        aliases: ["urgent repair"],
        pricingText: "Contact us for emergency pricing.",
        bookingLinkUrl: "https://example.com/book",
      },
      {
        sourceKey: "maintenance",
        name: "Maintenance",
        description: "Planned maintenance visits.",
        aliases: [],
        pricingText: null,
        bookingLinkUrl: null,
      },
    ],
    weeklyHours: [
      { day: "monday", closed: false, periods: [{ open: "9:00am", close: "5:00pm" }], note: null },
      { day: "tuesday", closed: false, periods: [{ open: "09:00", close: "17:00" }], note: null },
      { day: "saturday", closed: true, periods: [], note: "Closed" },
    ],
    locations: [],
    coverage: {
      modeHint: "service area",
      description: "Serving Austin and nearby communities.",
      cities: ["Austin"],
      regions: ["Central Texas"],
      postalCodes: [],
    },
    knowledgeItems: [
      {
        sourceKey: "warranty_policy",
        type: "policy",
        title: "Warranty",
        question: "Do you offer a warranty?",
        answer: "Warranty details are confirmed by the team after reviewing the repair.",
        relatedUrl: null,
      },
    ],
    links: [
      {
        sourceKey: "contact",
        type: "contact",
        label: "Contact",
        url: "https://example.com/contact",
      },
    ],
    evidence: [
      {
        entityType: "business",
        entityKey: "business",
        field: "name",
        sourceDocumentIds: ["source_1"],
        sourceUrl: "https://example.com",
        confidence: 0.98,
        conflictingValues: [],
        excerpt: "Northstar Repairs",
      },
      {
        entityType: "business",
        entityKey: "business",
        field: "publicPhone",
        sourceDocumentIds: ["source_1"],
        sourceUrl: "https://example.com/contact",
        confidence: 0.92,
        conflictingValues: [],
        excerpt: "Call +1 555 0100",
      },
      {
        entityType: "offering",
        entityKey: "emergency_repair",
        field: "name",
        sourceDocumentIds: ["source_2"],
        sourceUrl: "https://example.com/services",
        confidence: 0.9,
        conflictingValues: [],
        excerpt: "Emergency repair",
      },
      {
        entityType: "offering",
        entityKey: "emergency_repair",
        field: "pricingText",
        sourceDocumentIds: ["source_2"],
        sourceUrl: "https://example.com/services",
        confidence: 0.82,
        conflictingValues: [],
        excerpt: "Contact us for emergency pricing.",
      },
      {
        entityType: "offering",
        entityKey: "emergency_repair",
        field: "bookingLinkUrl",
        sourceDocumentIds: ["source_2"],
        sourceUrl: "https://example.com/book",
        confidence: 0.9,
        conflictingValues: [],
        excerpt: "Book now",
      },
      {
        entityType: "hours",
        entityKey: "weekly",
        field: "regularHours",
        sourceDocumentIds: ["source_1"],
        sourceUrl: "https://example.com",
        confidence: 0.86,
        conflictingValues: [],
        excerpt: "Mon-Fri 9-5",
      },
      {
        entityType: "knowledge",
        entityKey: "warranty_policy",
        field: "answer",
        sourceDocumentIds: ["source_2"],
        sourceUrl: "https://example.com/services",
        confidence: 0.8,
        conflictingValues: [],
        excerpt: "Warranty details are confirmed...",
      },
    ],
    unresolved: [],
    warnings: [],
  };
}

describe("website import evidence mapping", () => {
  it("keeps the compact model schema within the Gemini compatibility budget", () => {
    const schema = toGeminiJsonSchema(WebsiteEvidenceBundleSchema);
    expect(() => assertGeminiSchemaCompatible(schema)).not.toThrow();
  });

  it("rejects the full canonical plan schema as a model transport schema", () => {
    const fullSchema = toGeminiJsonSchema(
      z.object({
        document: AnsweringPlanDocumentSchema,
        fieldMetadata: FieldMetadataMapSchema,
      }),
    );
    expect(() => assertGeminiSchemaCompatible(fullSchema)).toThrow(GeminiSchemaCompatibilityError);
  });

  it("normalizes omitted nullable evidence fields before validation", () => {
    const parsed = parseWebsiteEvidenceBundle({
      business: {
        name: "Internet Assigned Numbers Authority",
        websiteUrl: "https://www.iana.org",
        businessType: null,
        shortDescription: null,
        timezone: null,
        primaryLanguage: "en",
        publicPhone: null,
        publicEmail: null,
        address: {
          country: "United States",
        },
      },
      coverage: {
        modeHint: null,
        description: null,
      },
    });

    expect(parsed.business.address).toEqual({
      line1: null,
      city: null,
      region: null,
      postalCode: null,
      country: "United States",
    });
    expect(parsed.offerings).toEqual([]);
    expect(parsed.coverage.cities).toEqual([]);
  });

  it("assembles website evidence into the canonical plan without making public contact routing behavior", async () => {
    const assembled = assembleWebsiteEvidenceIntoPlan({
      evidence: evidence(),
      submittedUrl: "https://example.com",
      sourceDocuments,
      now: new Date("2026-06-24T18:00:00.000Z"),
    });

    expect(() => assertPlanIntegrity(assembled.document)).not.toThrow();
    expect(assembled.document.businessProfile.businessName).toBe("Northstar Repairs");
    expect(assembled.document.businessProfile.publicContact.phone).toBe("+1 555 0100");
    expect(assembled.document.routing.enabled).toBe(false);
    expect(assembled.document.routing.contacts).toEqual([]);
    expect(assembled.document.scenarios.flatMap((scenario) => scenario.actions).some((action) => action.type === "transfer")).toBe(false);
    expect(assembled.document.offerings[0].pricing).toMatchObject({
      mode: "approved_custom_wording",
      approvedWording: "Contact us for emergency pricing.",
    });
    expect(assembled.document.offerings[1].pricing.mode).toBe("do_not_quote");
    expect(assembled.document.booking).toMatchObject({
      enabled: true,
      defaultMethod: "send_link",
      bookingLinkId: expect.any(String),
    });
    expect(assembled.fieldMetadata["/businessProfile/publicContact/phone"]).toMatchObject({
      sourceType: "website",
      lastChangedBy: "website_builder",
    });
    expect(assembled.fieldMetadata["/routing"]).toMatchObject({
      sourceType: "answerley_default",
    });

    const compiler = new FoundationPreviewRuntimeCompiler();
    const runtime = await compiler.compile({
      plan: {
        id: "plan_import_test",
        businessId: "business_import_test",
        revision: 1,
        publishedRevision: null,
        document: assembled.document,
        fieldMetadata: assembled.fieldMetadata,
        createdAt: "2026-06-24T18:00:00.000Z",
        updatedAt: "2026-06-24T18:00:00.000Z",
      },
      mode: "test",
      model: "gemini-3.1-flash-live-preview",
      currentTime: "2026-06-24T18:00:00.000Z",
    });
    expect(runtime.coverage.offeringIds).toContain("offering_emergency_repair");
  });

  it("surfaces conflicting website evidence through readiness", () => {
    const candidate = evidence();
    candidate.evidence.push({
      entityType: "hours",
      entityKey: "weekly",
      field: "regularHours",
      sourceDocumentIds: ["source_1"],
      sourceUrl: "https://example.com",
      confidence: 0.5,
      conflictingValues: ["Friday closes at 4 PM", "Friday closes at 5 PM"],
      excerpt: "Hours conflict",
    });
    const assembled = assembleWebsiteEvidenceIntoPlan({
      evidence: candidate,
      submittedUrl: "https://example.com",
      sourceDocuments,
      now: new Date("2026-06-24T18:00:00.000Z"),
    });

    const plan = {
      id: "plan_conflict",
      businessId: "business_conflict",
      revision: 1,
      publishedRevision: null,
      document: assembled.document,
      fieldMetadata: assembled.fieldMetadata,
      createdAt: "2026-06-24T18:00:00.000Z",
      updatedAt: "2026-06-24T18:00:00.000Z",
    };
    const readiness = calculatePlanReadiness(plan);
    expect(readiness.issues.some((issue) => issue.id === "conflict-/hoursAvailability/regularHours")).toBe(true);
  });

  it("can build a partial canonical plan when extraction fails", () => {
    const assembled = assembleWebsiteEvidenceIntoPlan({
      evidence: emptyWebsiteEvidenceBundle("extraction unavailable"),
      submittedUrl: "https://example.com",
      sourceDocuments,
      now: new Date("2026-06-24T18:00:00.000Z"),
    });

    expect(() => assertPlanIntegrity(assembled.document)).not.toThrow();
    expect(assembled.unresolved[0]).toMatchObject({
      planPath: "/",
      reason: "extraction unavailable",
    });
    expect(assembled.document.businessProfile.websiteUrl).toBe("https://example.com/");
    expect(assembled.document.offerings).toEqual([]);
    expect(assembled.document.routing.enabled).toBe(false);
  });
});
