import { describe, expect, it } from "vitest";
import { applySetupChange } from "../patches";
import {
  fieldRegistry,
  setupSections,
  summarizeSetupCounts,
  topLevelSetupPaths,
} from "../registry";
import { demoAnsweringSetup } from "../fixtures";
import { buildSetupFromWebsiteEvidence } from "../import/from-website-evidence";
import { setupToAnsweringPlanEnvelope } from "../import/from-answering-plan";
import {
  labelSbaValue,
  labelRequestField,
  ownerAlertTemplateFields,
  renderOwnerAlertTemplatePreview,
  requestCaptureFieldOptions,
} from "../selectors";
import {
  ActivationGateSchema,
  AlertContactSchema,
  AppointmentHandlingSchema,
  CallHandlingSchema,
  EvidenceSourceSchema,
  HoursSchema,
  PrivacySchema,
  RequestFieldSchema,
  SetupStatusSchema,
} from "../schema";
import type { WebsiteEvidenceBundle } from "@/domain/answering-plan/import/website-evidence";

describe("focused canonical mapping", () => {
  it("maps every top-level setup field to at least one owner-facing section", () => {
    const mapped = new Set(
      setupSections.flatMap((section) =>
        section.setupPaths.map((path) => path.split("/").filter(Boolean)[0]),
      ),
    );
    for (const topLevel of topLevelSetupPaths) {
      expect(mapped.has(topLevel), `${topLevel} is not mapped to the UI registry`).toBe(true);
    }
  });

  it("keeps field registry paths inside known setup sections", () => {
    const sectionIds = new Set(setupSections.map((section) => section.id));
    for (const field of fieldRegistry) {
      expect(sectionIds.has(field.section), `${field.id} uses an unknown section`).toBe(true);
      expect(field.pathPattern.startsWith("/")).toBe(true);
    }
  });

  it("summarizes counts from the focused setup, not the legacy plan", () => {
    const counts = summarizeSetupCounts(demoAnsweringSetup);
    expect(counts.services).toBe(2);
    expect(counts.approvedAnswers).toBe(2);
    expect(counts.ownerAlertContacts).toBe(1);
  });

  it("applies setup patches and increments the draft revision", () => {
    const applied = applySetupChange(demoAnsweringSetup, {
      id: "proposal_test",
      baseRevision: demoAnsweringSetup.status.draftRevision,
      source: "setup_assistant",
      summary: "Change greeting",
      userInstruction: "Say thanks for calling first",
      riskLevel: "medium",
      requiresConfirmation: true,
      operations: [
        {
          op: "replace",
          path: "/callHandling/callerGreeting",
          value: "Thanks for calling Brightfield Services. What can I help with?",
        },
      ],
      affectedPaths: ["/callHandling/callerGreeting"],
      conflicts: [],
      clarification: null,
    });
    expect(applied.setup.status.draftRevision).toBe(demoAnsweringSetup.status.draftRevision + 1);
    expect(applied.setup.callHandling.callerGreeting).toContain("What can I help with?");
  });

  it("adapts draft focused setups into runtime-compatible legacy envelopes", () => {
    const envelope = setupToAnsweringPlanEnvelope(demoAnsweringSetup);
    expect(envelope.revision).toBe(demoAnsweringSetup.status.draftRevision);
    expect(envelope.publishedRevision).toBeNull();
    expect(envelope.document.greetingVoice.assistantName).toBe("Small Business Answering");
    expect(JSON.stringify(envelope.document)).not.toContain("Answerley");
  });

  it("keeps request capture field labels mapped to every canonical field", () => {
    const optionIds = requestCaptureFieldOptions.map((option) => option.id).sort();
    expect(optionIds).toEqual([...RequestFieldSchema.options].sort());
    for (const option of requestCaptureFieldOptions) {
      expect(option.label).not.toContain("_");
      expect(labelRequestField(option.id)).toBe(option.label);
    }
  });

  it("labels rendered canonical values without raw enum syntax", () => {
    const renderedValues = new Set([
      ...RequestFieldSchema.options,
      ...HoursSchema.shape.afterHours.shape.mode.options,
      ...CallHandlingSchema.shape.mode.options,
      ...CallHandlingSchema.shape.unknownAnswerBehavior.options,
      ...AppointmentHandlingSchema.shape.mode.options,
      "none",
      "connected",
      ...AlertContactSchema.shape.role.options,
      ...PrivacySchema.shape.callRecording.options,
      ...EvidenceSourceSchema.shape.type.options,
      ...SetupStatusSchema.shape.mode.options,
      ...ActivationGateSchema.shape.status.options,
      "approved_answer",
      "service",
      "appointment",
      "message",
      "urgent",
      "unknown",
      "new",
      "contacted",
      "booked",
      "completed",
      "archived",
      "owner_alert",
      "caller_confirmation",
      "caller_message",
      "in_app",
      "high",
      "medium",
      "low",
    ]);

    for (const value of renderedValues) {
      const label = labelSbaValue(value);
      expect(label, value).not.toMatch(/[{}_]/);
      expect(label.trim(), value).not.toEqual("");
      if (value.includes("_")) {
        expect(label, value).not.toBe(value);
      }
    }
  });

  it("renders owner alert templates without exposing placeholder syntax", () => {
    const preview = renderOwnerAlertTemplatePreview(demoAnsweringSetup.ownerAlerts.messageTemplate);
    expect(preview).not.toContain("{{");
    expect(preview).not.toContain("}}");
    expect(preview).toContain("Jamie Parker");
    expect(ownerAlertTemplateFields(demoAnsweringSetup.ownerAlerts.messageTemplate)).toEqual([
      "caller_name",
      "reason",
      "preferred_time",
    ]);
  });

  it("imports website evidence directly into the focused Answering Setup", () => {
    const evidence: WebsiteEvidenceBundle = {
      business: {
        name: "Northside Plumbing",
        websiteUrl: "https://northside.example",
        businessType: "Plumbing",
        shortDescription: "Residential plumbing repair.",
        timezone: "America/Chicago",
        primaryLanguage: "en",
        publicPhone: "+1 312 555 0112",
        publicEmail: "hello@northside.example",
        address: null,
      },
      offerings: [
        { sourceKey: "emergency", name: "Emergency plumbing", description: "Urgent plumbing repair.", aliases: ["emergency repair"], pricingText: null, bookingLinkUrl: null },
      ],
      weeklyHours: [],
      locations: [],
      coverage: { modeHint: "service_area", description: "Chicago and nearby suburbs.", cities: ["Chicago"], regions: [], postalCodes: [] },
      knowledgeItems: [
        { sourceKey: "hours", type: "faq", title: "Hours", question: "When are you open?", answer: "We answer calls 24/7.", relatedUrl: null },
      ],
      links: [],
      evidence: [],
      unresolved: [],
      warnings: [],
    };
    const setup = buildSetupFromWebsiteEvidence({ evidence, submittedUrl: "https://northside.example", sourceDocuments: [] });
    const envelope = setupToAnsweringPlanEnvelope(setup);
    expect(setup.business.name).toBe("Northside Plumbing");
    expect(setup.services[0]?.name).toBe("Emergency plumbing");
    expect(setup.approvedAnswers[0]?.question).toBe("When are you open?");
    expect(envelope.document.locationsCoverage.locations).toEqual([]);
    expect(JSON.stringify(envelope.document.locationsCoverage)).not.toContain("Winnipeg");
  });
});
