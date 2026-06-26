import type { WebsiteEvidenceBundle } from "@/domain/answering-plan/import/website-evidence";
import { AnsweringSetupSchema, SBA_SCHEMA_VERSION, type AnsweringSetup } from "../schema";

type SourceDocument = {
  id: string;
  url: string;
  title: string | null;
};

type RegularHours = AnsweringSetup["hours"]["regular"];
type DayHours = RegularHours["monday"];

const closedDay: DayHours = {
  open: false,
  periods: [],
  callerWording: "We are closed today, but I can take a message.",
};

function fallbackHours(): RegularHours {
  return {
    monday: { open: true, periods: [{ opensAt: "09:00", closesAt: "17:00" }], callerWording: null },
    tuesday: { open: true, periods: [{ opensAt: "09:00", closesAt: "17:00" }], callerWording: null },
    wednesday: { open: true, periods: [{ opensAt: "09:00", closesAt: "17:00" }], callerWording: null },
    thursday: { open: true, periods: [{ opensAt: "09:00", closesAt: "17:00" }], callerWording: null },
    friday: { open: true, periods: [{ opensAt: "09:00", closesAt: "17:00" }], callerWording: null },
    saturday: closedDay,
    sunday: closedDay,
  };
}

function stableSlug(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || fallback;
}

function normalizeUrl(value: string | null, fallback: string) {
  if (!value) return fallback;
  try {
    return new URL(value).toString();
  } catch {
    try {
      return new URL(value, fallback).toString();
    } catch {
      return fallback;
    }
  }
}

function normalizeTime(value: string) {
  const trimmed = value.trim().toLowerCase();
  const meridiemMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]);
    const minute = Number(meridiemMatch[2] ?? "0");
    const meridiem = meridiemMatch[3];
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const twentyFourHourMatch = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourMatch) {
    return `${String(Number(twentyFourHourMatch[1])).padStart(2, "0")}:${twentyFourHourMatch[2]}`;
  }
  return null;
}

function buildRegularHours(evidence: WebsiteEvidenceBundle) {
  const regular = fallbackHours();
  for (const day of evidence.weeklyHours) {
    const periods = day.periods
      .map((period) => {
        const opensAt = normalizeTime(period.open);
        const closesAt = normalizeTime(period.close);
        return opensAt && closesAt ? { opensAt, closesAt } : null;
      })
      .filter((value): value is { opensAt: string; closesAt: string } => value !== null);
    regular[day.day] = {
      open: !day.closed && periods.length > 0,
      periods: day.closed ? [] : periods,
      callerWording: day.note,
    };
  }
  return regular;
}

function sourceIdsFor(evidence: WebsiteEvidenceBundle, entityType: string, entityKey?: string) {
  const ids = new Set<string>();
  for (const item of evidence.evidence) {
    if (item.entityType !== entityType) continue;
    if (entityKey && item.entityKey !== entityKey) continue;
    item.sourceDocumentIds.forEach((id) => ids.add(id));
  }
  return [...ids];
}

function gateStatus(hasValue: boolean, review = true) {
  if (!hasValue) return "blocked" as const;
  return review ? "needs_review" as const : "complete" as const;
}

export function buildSetupFromWebsiteEvidence(params: {
  evidence: WebsiteEvidenceBundle;
  submittedUrl: string;
  sourceDocuments: SourceDocument[];
  now?: Date;
}): AnsweringSetup {
  const { evidence } = params;
  const now = params.now ?? new Date();
  const websiteUrl = normalizeUrl(evidence.business.websiteUrl, params.submittedUrl);
  const businessName = evidence.business.name?.trim() || new URL(websiteUrl).hostname.replace(/^www\./, "");
  const setupId = `setup_${stableSlug(businessName, "website")}`;
  const businessId = `business_${stableSlug(businessName, "website")}`;
  const services = evidence.offerings.map((offering, index) => ({
    id: `service_${stableSlug(offering.sourceKey || offering.name, String(index + 1))}`,
    enabled: true,
    name: offering.name,
    approvedDescription: offering.description || null,
    aliases: offering.aliases,
    canAnswerQuestions: true,
    canCaptureRequest: true,
    appointmentEligible: Boolean(offering.bookingLinkUrl),
    pricingWording: offering.pricingText,
  }));
  const approvedAnswers = evidence.knowledgeItems.map((item, index) => ({
    id: `answer_${stableSlug(item.sourceKey || item.title, String(index + 1))}`,
    question: item.question || item.title,
    answer: item.answer,
    sourceIds: sourceIdsFor(evidence, "knowledge", item.sourceKey),
    needsReview: true,
  }));
  const bookingLink = evidence.links.find((link) => link.type === "booking")?.url
    ?? evidence.offerings.find((offering) => offering.bookingLinkUrl)?.bookingLinkUrl
    ?? null;
  const areaSummary = [
    ...evidence.coverage.cities,
    ...evidence.coverage.regions,
    ...evidence.coverage.postalCodes,
  ].join(", ");
  const serviceAreaSummary = evidence.coverage.description ?? (areaSummary || null);
  const hasHoursEvidence = evidence.weeklyHours.length > 0;
  const hasServicesOrAnswers = services.length > 0 || approvedAnswers.length > 0;

  return AnsweringSetupSchema.parse({
    schemaVersion: SBA_SCHEMA_VERSION,
    setupId,
    businessId,
    brand: "Small Business Answering",
    status: {
      mode: "draft",
      draftRevision: 1,
      liveRevision: 0,
      isLive: false,
      isPaused: false,
      lastPublishedAt: null,
      lastTestedAt: null,
      needsReview: true,
    },
    business: {
      name: businessName,
      websiteUrl,
      publicPhone: evidence.business.publicPhone,
      publicEmail: evidence.business.publicEmail,
      timezone: evidence.business.timezone ?? "America/Chicago",
      primaryLanguage: evidence.business.primaryLanguage ?? "en",
      additionalLanguages: [],
      pronunciation: null,
      address: {
        line1: evidence.business.address?.line1 ?? null,
        line2: null,
        city: evidence.business.address?.city ?? null,
        region: evidence.business.address?.region ?? null,
        postalCode: evidence.business.address?.postalCode ?? null,
        country: evidence.business.address?.country ?? null,
      },
      serviceArea: {
        summary: serviceAreaSummary,
        areas: [
          ...evidence.coverage.cities,
          ...evidence.coverage.regions,
          ...evidence.coverage.postalCodes,
        ],
      },
    },
    services,
    approvedAnswers,
    hours: {
      timezone: evidence.business.timezone ?? "America/Chicago",
      regular: buildRegularHours(evidence),
      temporaryUpdate: null,
      afterHours: {
        enabled: true,
        mode: "take_message",
        callerWording: "The team is unavailable right now, but I can take a message for them.",
        urgentWording: "If this is urgent, I can collect the details and alert the business.",
      },
    },
    callHandling: {
      mode: "overflow",
      answerTiming: {
        ringDelaySeconds: 30,
        answerWhenClosed: true,
        answerWhenBusy: true,
      },
      callerGreeting: `Thanks for calling ${businessName}. How can I help today?`,
      unknownAnswerBehavior: "take_message_and_flag",
    },
    requestCapture: {
      fields: ["caller_name", "phone", "reason", "service_needed", "preferred_time", "email"],
      callerSummaryWording: "I have captured your request and will send the details to the team.",
    },
    appointmentHandling: {
      mode: bookingLink ? "send_booking_link" : "capture_request",
      bookingLinkUrl: bookingLink,
      calendarIntegration: "none",
      doNotCallBookedUntilConfirmed: true,
    },
    urgentRouting: {
      enabled: true,
      detectionPhrases: ["emergency", "urgent", "cannot wait"],
      collectFields: ["caller_name", "phone", "reason", "urgency"],
      transferEnabled: false,
      alertContactIds: ["contact_owner"],
    },
    ownerAlerts: {
      contacts: [
        {
          id: "contact_owner",
          role: "owner",
          name: "Owner",
          sms: null,
          email: null,
          enabled: true,
        },
      ],
      channels: ["email"],
      messageTemplate: "New call from {{caller_name}} about {{reason}}. Preferred time: {{preferred_time}}.",
    },
    callerConfirmations: {
      enabled: false,
      smsTemplate: null,
      sendBookingLinkWhenRelevant: Boolean(bookingLink),
    },
    spamScreening: {
      enabled: true,
      keepOutOfBillableUsage: true,
      callerWording: "Thanks for calling. May I ask what this is regarding?",
    },
    privacy: {
      callRecording: "off",
      retentionDays: 30,
      callerDisclosure: "Calls may be summarized so the business can respond.",
    },
    sources: [
      ...params.sourceDocuments.map((document) => ({
        id: document.id,
        type: "website",
        label: document.title ?? document.url,
        url: document.url,
        excerpt: null,
        capturedAt: now.toISOString(),
      })),
      ...evidence.evidence.slice(0, 20).map((item, index) => ({
        id: `source_evidence_${index + 1}`,
        type: "website",
        label: `${item.entityType}: ${item.field}`,
        url: item.sourceUrl,
        excerpt: item.excerpt,
        capturedAt: now.toISOString(),
      })),
    ],
    activationGates: [
      { id: "business_details", label: "Business details", status: gateStatus(Boolean(businessName && websiteUrl)), description: "Confirm the business name, website, contact details, timezone, and service area." },
      { id: "services_answers", label: "Services and approved answers", status: gateStatus(hasServicesOrAnswers), description: "Review services, safe pricing wording, FAQs, and what the setup can answer." },
      { id: "hours_after_hours", label: "Hours and after-hours", status: gateStatus(hasHoursEvidence), description: "Confirm open hours, closed-day wording, and after-hours message handling." },
      { id: "greeting_voice", label: "Greeting and voice", status: "needs_review", description: "Approve the caller greeting, tone, language, and disclosure wording." },
      { id: "owner_alerts", label: "Owner alerts", status: "blocked", description: "Add an SMS number or email for owner alerts and urgent notifications." },
      { id: "phone_routing", label: "Phone routing", status: "blocked", description: "Choose forwarding, overflow, after-hours, or immediate answering before real callers hear it." },
      { id: "billing", label: "Billing", status: "blocked", description: "Add payment before live calls can be activated." },
      { id: "final_test", label: "Final test", status: "blocked", description: "Complete one approved test before publishing the setup for real callers." },
    ],
  });
}
