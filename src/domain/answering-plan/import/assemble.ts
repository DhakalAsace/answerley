import { assertPlanIntegrity } from "@/domain/answering-plan/integrity";
import {
  AnsweringPlanDocumentSchema,
  FieldMetadataMapSchema,
  type FieldMetadataMap,
} from "@/domain/answering-plan/schema";
import { createDefaultAnsweringPlanDocument, emptyWeeklySchedule } from "./defaults";
import {
  defaultMetadata,
  findEvidence,
  websiteMetadata,
  type SourceDocumentSummary,
} from "./metadata";
import { uniqueStableId } from "./stable-id";
import type { WebsiteEvidenceBundle } from "./website-evidence";

type DayKey = keyof ReturnType<typeof emptyWeeklySchedule>;

export interface AssembleWebsitePlanInput {
  evidence: WebsiteEvidenceBundle;
  submittedUrl: string;
  sourceDocuments: SourceDocumentSummary[];
  now?: Date;
}

export interface AssembledWebsitePlan {
  document: ReturnType<typeof AnsweringPlanDocumentSchema.parse>;
  fieldMetadata: FieldMetadataMap;
  unresolved: Array<{
    planPath: string;
    reason: string;
    candidateValues: unknown[];
  }>;
  warnings: string[];
}

const intakeFieldIds = ["field_name", "field_phone", "field_email", "field_details"];

export function assembleWebsiteEvidenceIntoPlan(input: AssembleWebsitePlanInput): AssembledWebsitePlan {
  const observedAt = (input.now ?? new Date()).toISOString();
  const document = createDefaultAnsweringPlanDocument();
  const metadata: FieldMetadataMap = {};
  const unresolved: AssembledWebsitePlan["unresolved"] = input.evidence.unresolved.map((item) => ({
    planPath: areaToPlanPath(item.area),
    reason: item.reason,
    candidateValues: [],
  }));
  const warnings = [...input.evidence.warnings];

  applyBusinessEvidence(document, metadata, input, observedAt);
  const linkIdBySourceKey = applyLinks(document, metadata, input, observedAt, warnings);
  applyOfferings(document, metadata, input, observedAt, linkIdBySourceKey);
  applyHours(document, metadata, input, observedAt, warnings);
  applyLocationsAndCoverage(document, metadata, input, observedAt);
  applyKnowledge(document, metadata, input, observedAt, linkIdBySourceKey, warnings);
  applyBookingDefaults(document, metadata, observedAt);
  applyDefaultMetadata(metadata, observedAt);

  const validatedDocument = AnsweringPlanDocumentSchema.parse(document);
  assertPlanIntegrity(validatedDocument);
  const validatedMetadata = FieldMetadataMapSchema.parse(metadata);
  return {
    document: validatedDocument,
    fieldMetadata: validatedMetadata,
    unresolved,
    warnings,
  };
}

function applyBusinessEvidence(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  input: AssembleWebsitePlanInput,
  observedAt: string,
) {
  const { evidence } = input;
  const business = evidence.business;
  const websiteUrl = validUrl(business.websiteUrl) ?? validUrl(input.submittedUrl);

  if (business.name?.trim()) {
    document.businessProfile.businessName = business.name.trim();
    document.greetingVoice.openingGreeting = `Thanks for calling ${business.name.trim()}. How can I help today?`;
    document.greetingVoice.voicePreviewText = document.greetingVoice.openingGreeting;
    metadata["/businessProfile/businessName"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "name"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (websiteUrl) {
    document.businessProfile.websiteUrl = websiteUrl;
    metadata["/businessProfile/websiteUrl"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "websiteUrl"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (business.businessType?.trim()) {
    document.businessProfile.businessType.label = business.businessType.trim();
    metadata["/businessProfile/businessType"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "businessType"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (business.shortDescription?.trim()) {
    document.businessProfile.description = business.shortDescription.trim();
    metadata["/businessProfile/description"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "shortDescription"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (business.timezone?.trim()) {
    document.businessProfile.timezone = business.timezone.trim();
    document.hoursAvailability.timezone = business.timezone.trim();
    metadata["/businessProfile/timezone"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "timezone"),
      input.sourceDocuments,
      observedAt,
      "Timezone reported or inferred from website evidence; confirm before live calls if uncertain.",
    );
    metadata["/hoursAvailability/timezone"] = metadata["/businessProfile/timezone"];
  }

  if (business.primaryLanguage?.trim()) {
    document.businessProfile.primaryLanguage = business.primaryLanguage.trim();
    document.greetingVoice.primaryLanguage = business.primaryLanguage.trim();
    metadata["/businessProfile/primaryLanguage"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "primaryLanguage"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (business.publicPhone?.trim()) {
    document.businessProfile.publicContact.phone = business.publicPhone.trim();
    metadata["/businessProfile/publicContact/phone"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "publicPhone"),
      input.sourceDocuments,
      observedAt,
      "Public website phone. Not used as a transfer or owner-alert destination without user confirmation.",
    );
  }

  if (business.publicEmail?.trim() && validEmail(business.publicEmail)) {
    document.businessProfile.publicContact.email = business.publicEmail.trim();
    metadata["/businessProfile/publicContact/email"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "publicEmail"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (business.address) {
    document.businessProfile.address = {
      line1: cleanNullable(business.address.line1),
      line2: null,
      city: cleanNullable(business.address.city),
      region: cleanNullable(business.address.region),
      postalCode: cleanNullable(business.address.postalCode),
      country: cleanNullable(business.address.country),
    };
    metadata["/businessProfile/address"] = websiteMetadata(
      findEvidence(evidence, "business", "business", "address"),
      input.sourceDocuments,
      observedAt,
    );
  }
}

function applyLinks(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  input: AssembleWebsitePlanInput,
  observedAt: string,
  warnings: string[],
) {
  const usedIds = new Set<string>();
  const linkIdBySourceKey = new Map<string, string>();

  for (const [index, link] of input.evidence.links.entries()) {
    const url = validUrl(link.url);
    if (!url || !link.label.trim()) {
      warnings.push(`Skipped invalid link evidence "${link.sourceKey}".`);
      continue;
    }
    const id = uniqueStableId("link", link.sourceKey || link.label || url, usedIds, index + 1);
    linkIdBySourceKey.set(link.sourceKey, id);
    document.links.push({
      id,
      enabled: true,
      label: link.label.trim(),
      type: link.type,
      url,
      description: null,
    });
    metadata[`/links/${document.links.length - 1}`] = websiteMetadata(
      findEvidence(input.evidence, "link", link.sourceKey, "url"),
      input.sourceDocuments,
      observedAt,
    );
  }

  for (const [index, offering] of input.evidence.offerings.entries()) {
    const bookingLinkUrl = validUrl(offering.bookingLinkUrl);
    if (!bookingLinkUrl) continue;
    const sourceKey = `${offering.sourceKey}:booking`;
    if (linkIdBySourceKey.has(sourceKey)) continue;
    const id = uniqueStableId("link", `${offering.name || "booking"} booking`, usedIds, index + 1);
    linkIdBySourceKey.set(sourceKey, id);
    document.links.push({
      id,
      enabled: true,
      label: `${offering.name.trim() || "Booking"} booking`,
      type: "booking",
      url: bookingLinkUrl,
      description: "Booking link found on the website.",
    });
    metadata[`/links/${document.links.length - 1}`] = websiteMetadata(
      findEvidence(input.evidence, "offering", offering.sourceKey, "bookingLinkUrl"),
      input.sourceDocuments,
      observedAt,
    );
  }

  return linkIdBySourceKey;
}

function applyOfferings(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  input: AssembleWebsitePlanInput,
  observedAt: string,
  linkIdBySourceKey: Map<string, string>,
) {
  const usedIds = new Set<string>();
  for (const [index, offering] of input.evidence.offerings.entries()) {
    if (!offering.name.trim()) continue;
    const id = uniqueStableId("offering", offering.sourceKey || offering.name, usedIds, index + 1);
    const bookingLinkId = linkIdBySourceKey.get(`${offering.sourceKey}:booking`) ?? null;
    const pricingText = cleanNullable(offering.pricingText);
    document.offerings.push({
      id,
      enabled: true,
      name: offering.name.trim(),
      title: offering.name.trim(),
      description: cleanNullable(offering.description),
      aliases: offering.aliases.map((alias) => alias.trim()).filter(Boolean),
      canAnswerQuestions: true,
      requestable: true,
      bookable: Boolean(bookingLinkId),
      canSendBookingLink: Boolean(bookingLinkId),
      pricing: {
        mode: pricingText ? "approved_custom_wording" : "do_not_quote",
        currency: "USD",
        startingPrice: null,
        minimumPrice: null,
        maximumPrice: null,
        fixedPrice: null,
        approvedWording: pricingText,
      },
      requestTypeId: "request_general",
      intakeFieldIds,
      locationIds: [],
      linkIds: bookingLinkId ? [bookingLinkId] : [],
      additionalInstructions: null,
    });
    const offeringIndex = document.offerings.length - 1;
    metadata[`/offerings/${offeringIndex}/name`] = websiteMetadata(
      findEvidence(input.evidence, "offering", offering.sourceKey, "name"),
      input.sourceDocuments,
      observedAt,
    );
    metadata[`/offerings/${offeringIndex}/description`] = websiteMetadata(
      findEvidence(input.evidence, "offering", offering.sourceKey, "description"),
      input.sourceDocuments,
      observedAt,
    );
    metadata[`/offerings/${offeringIndex}/pricing`] = pricingText
      ? websiteMetadata(
          findEvidence(input.evidence, "offering", offering.sourceKey, "pricingText"),
          input.sourceDocuments,
          observedAt,
          "Pricing wording was found on the website. Review before live use.",
        )
      : defaultMetadata(
          "answerley_default",
          "No explicit pricing was found; Answerley will not quote pricing.",
          observedAt,
        );
  }
}

function applyHours(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  input: AssembleWebsitePlanInput,
  observedAt: string,
  warnings: string[],
) {
  if (!input.evidence.weeklyHours.length) {
    metadata["/hoursAvailability/enabled"] = defaultMetadata(
      "answerley_default",
      "No regular hours were extracted from the website.",
      observedAt,
    );
    return;
  }

  document.hoursAvailability.enabled = true;
  const schedule = emptyWeeklySchedule();
  for (const day of input.evidence.weeklyHours) {
    const periods = day.periods
      .map((period) => ({
        opensAt: normalizeTime(period.open),
        closesAt: normalizeTime(period.close),
      }))
      .filter((period) => period.opensAt && period.closesAt)
      .map((period) => ({ opensAt: period.opensAt!, closesAt: period.closesAt! }));

    if (!day.closed && !periods.length) {
      warnings.push(`Skipped invalid hours for ${day.day}.`);
    }
    schedule[day.day as DayKey] = {
      open: !day.closed && periods.length > 0,
      periods,
      note: cleanNullable(day.note),
    };
  }
  document.hoursAvailability.regularHours = schedule;
  metadata["/hoursAvailability/regularHours"] = websiteMetadata(
    findEvidence(input.evidence, "hours", "weekly", "regularHours"),
    input.sourceDocuments,
    observedAt,
  );
}

function applyLocationsAndCoverage(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  input: AssembleWebsitePlanInput,
  observedAt: string,
) {
  const usedIds = new Set<string>();
  const businessAddress = input.evidence.business.address;
  if (businessAddress?.line1 || businessAddress?.city || businessAddress?.region) {
    const id = uniqueStableId("location", "main", usedIds);
    document.locationsCoverage.locations.push({
      id,
      enabled: true,
      name: "Main location",
      description: null,
      address: {
        line1: cleanNullable(businessAddress.line1),
        line2: null,
        city: cleanNullable(businessAddress.city),
        region: cleanNullable(businessAddress.region),
        postalCode: cleanNullable(businessAddress.postalCode),
        country: cleanNullable(businessAddress.country),
      },
      phone: document.businessProfile.publicContact.phone,
      email: document.businessProfile.publicContact.email,
      hoursOverride: null,
      offeringIds: [],
      bookingLinkId: null,
      routingRuleId: null,
    });
  }

  for (const [index, location] of input.evidence.locations.entries()) {
    if (!location.name.trim()) continue;
    const id = uniqueStableId("location", location.sourceKey || location.name, usedIds, index + 1);
    document.locationsCoverage.locations.push({
      id,
      enabled: true,
      name: location.name.trim(),
      description: cleanNullable(location.addressText),
      address: {
        line1: cleanNullable(location.addressText),
        line2: null,
        city: null,
        region: null,
        postalCode: null,
        country: null,
      },
      phone: cleanNullable(location.phone),
      email: location.email && validEmail(location.email) ? location.email.trim() : null,
      hoursOverride: null,
      offeringIds: [],
      bookingLinkId: null,
      routingRuleId: null,
    });
    metadata[`/locationsCoverage/locations/${document.locationsCoverage.locations.length - 1}`] =
      websiteMetadata(
        findEvidence(input.evidence, "location", location.sourceKey, "name"),
        input.sourceDocuments,
        observedAt,
      );
  }

  const serviceAreaValues = [
    ...input.evidence.coverage.cities.map((value) => ({ type: "city" as const, value })),
    ...input.evidence.coverage.regions.map((value) => ({ type: "region" as const, value })),
    ...input.evidence.coverage.postalCodes.map((value) => ({ type: "postal_code" as const, value })),
  ];
  for (const [index, area] of serviceAreaValues.entries()) {
    if (!area.value.trim()) continue;
    document.locationsCoverage.serviceAreas.push({
      id: uniqueStableId("coverage", area.value, usedIds, index + 1),
      enabled: true,
      type: area.type,
      label: area.value.trim(),
      value: area.value.trim(),
      excluded: false,
    });
  }

  const locationCount = document.locationsCoverage.locations.length;
  const serviceAreaCount = document.locationsCoverage.serviceAreas.length;
  document.locationsCoverage.enabled = locationCount > 0 || serviceAreaCount > 0 || Boolean(input.evidence.coverage.description);
  document.locationsCoverage.mode = deriveCoverageMode(input.evidence.coverage.modeHint, locationCount, serviceAreaCount);
  document.locationsCoverage.callerFacingDescription = cleanNullable(input.evidence.coverage.description);
  if (document.locationsCoverage.enabled) {
    metadata["/locationsCoverage"] = websiteMetadata(
      findEvidence(input.evidence, "coverage", "coverage", "description"),
      input.sourceDocuments,
      observedAt,
    );
  }
}

function applyKnowledge(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  input: AssembleWebsitePlanInput,
  observedAt: string,
  linkIdBySourceKey: Map<string, string>,
  warnings: string[],
) {
  const usedIds = new Set<string>();
  const linkIdByUrl = new Map(document.links.map((link) => [link.url, link.id]));

  for (const [index, item] of input.evidence.knowledgeItems.entries()) {
    if (!item.title.trim() || !item.answer.trim()) continue;
    const relatedUrl = validUrl(item.relatedUrl);
    let linkId = relatedUrl ? linkIdByUrl.get(relatedUrl) ?? null : null;
    if (relatedUrl && !linkId) {
      const link = {
        id: uniqueStableId("link", `${item.sourceKey || item.title} related`, new Set(document.links.map((existing) => existing.id)), index + 1),
        enabled: true,
        label: item.title.trim(),
        type: item.type === "faq" ? "faq" as const : "policy" as const,
        url: relatedUrl,
        description: null,
      };
      document.links.push(link);
      linkId = link.id;
      linkIdBySourceKey.set(`${item.sourceKey}:related`, link.id);
    }

    document.knowledgeItems.push({
      id: uniqueStableId("knowledge", item.sourceKey || item.title, usedIds, index + 1),
      enabled: true,
      type: item.type === "faq" ? "faq" : "policy",
      title: item.title.trim(),
      question: item.question.trim() || item.title.trim(),
      alternativeQuestions: [],
      answer: item.answer.trim(),
      behavior: {
        mode: linkId ? "answer_and_send_link" : "answer_directly",
        linkId,
        routingRuleId: null,
      },
      appliesTo: { offeringIds: [], locationIds: [] },
      internalNotes: null,
    });
    const knowledgeIndex = document.knowledgeItems.length - 1;
    metadata[`/knowledgeItems/${knowledgeIndex}/answer`] = websiteMetadata(
      findEvidence(input.evidence, "knowledge", item.sourceKey, "answer"),
      input.sourceDocuments,
      observedAt,
    );
  }

  if (input.evidence.knowledgeItems.some((item) => item.relatedUrl && !validUrl(item.relatedUrl))) {
    warnings.push("Some knowledge-item related links were skipped because they were not valid URLs.");
  }
}

function applyBookingDefaults(
  document: ReturnType<typeof createDefaultAnsweringPlanDocument>,
  metadata: FieldMetadataMap,
  observedAt: string,
) {
  const bookingLink = document.links.find((link) => link.enabled && link.type === "booking");
  if (!bookingLink) {
    metadata["/booking"] = defaultMetadata(
      "answerley_default",
      "No explicit booking link was found; booking is disabled until configured.",
      observedAt,
    );
    return;
  }

  document.booking.enabled = true;
  document.booking.defaultMethod = "send_link";
  document.booking.bookingLinkId = bookingLink.id;
  document.booking.confirmationWording = "I can share the booking link and capture your details for the team.";
  document.booking.unavailableBehavior = {
    mode: "collect_preferred_time",
    wording: "I can take your preferred time and have the team confirm it.",
  };
  const followUpId = "followup_booking_link";
  document.followUps.push({
    id: followUpId,
    enabled: true,
    name: "Booking link requested",
    trigger: "booking_link_requested",
    scenarioIds: ["scenario_request"],
    channel: "sms",
    recipientType: "caller",
    recipientIds: [],
    messageText: "Here is the booking link: {{booking_link}}",
    includeLink: true,
    linkId: bookingLink.id,
    notifyOwner: false,
    sendingWindow: { mode: "anytime", customRule: null },
  });
  const requestScenario = document.scenarios.find((scenario) => scenario.id === "scenario_request");
  if (requestScenario) {
    requestScenario.actions.push({ type: "prepare_follow_up", followUpId });
  }
  metadata["/booking"] = defaultMetadata(
    "answerley_default",
    "Booking send-link behavior was enabled because an explicit booking link was found.",
    observedAt,
  );
}

function applyDefaultMetadata(metadata: FieldMetadataMap, observedAt: string) {
  const defaults: Array<[string, string]> = [
    ["/requestTypes", "Standard request type generated by Answerley."],
    ["/intakeFields", "Standard caller intake fields generated by Answerley."],
    ["/scenarios", "Safe default call scenarios generated by Answerley."],
    ["/routing", "Routing is disabled until explicit recipients and rules are configured."],
    ["/unknownHandling", "Safe unknown-question handling generated by Answerley."],
    ["/spamScreening", "Standard spam-screening defaults generated by Answerley."],
    ["/greetingVoice/openingGreeting", "Initial greeting generated from imported business context."],
    ["/globalRules", "Global grounding and conversation defaults generated by Answerley."],
  ];
  for (const [path, note] of defaults) {
    metadata[path] ??= defaultMetadata("answerley_default", note, observedAt);
  }
}

function cleanNullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return null;
    }
  }
}

function normalizeTime(value: string) {
  const trimmed = value.trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const meridiem = match[3].toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function deriveCoverageMode(
  modeHint: string | null,
  locationCount: number,
  serviceAreaCount: number,
): ReturnType<typeof createDefaultAnsweringPlanDocument>["locationsCoverage"]["mode"] {
  const hint = modeHint?.toLowerCase() ?? "";
  if (hint.includes("remote")) return locationCount ? "hybrid" : "remote";
  if (hint.includes("service")) return serviceAreaCount && locationCount ? "hybrid" : "service_area";
  if (hint.includes("multiple")) return "multiple_locations";
  if (locationCount > 1) return "multiple_locations";
  if (locationCount === 1 && serviceAreaCount > 0) return "hybrid";
  if (locationCount === 1) return "single_location";
  if (serviceAreaCount > 0) return "service_area";
  return "not_applicable";
}

function areaToPlanPath(area: string) {
  const normalized = area.toLowerCase();
  if (normalized.includes("business")) return "/businessProfile";
  if (normalized.includes("hour")) return "/hoursAvailability";
  if (normalized.includes("location") || normalized.includes("coverage")) return "/locationsCoverage";
  if (normalized.includes("offering") || normalized.includes("service")) return "/offerings";
  if (normalized.includes("booking")) return "/booking";
  if (normalized.includes("knowledge") || normalized.includes("faq") || normalized.includes("policy")) return "/knowledgeItems";
  if (normalized.includes("link")) return "/links";
  return "/";
}
