import { genericAnsweringPlanFixture } from "@/domain/answering-plan/fixtures";
import type { AnsweringPlanEnvelope, ScenarioAction } from "@/domain/answering-plan/schema";
import { AnsweringPlanEnvelopeSchema } from "@/domain/answering-plan/schema";
import type { AnsweringSetup } from "../schema";
import { demoAnsweringSetup } from "../fixtures";
import { AnsweringSetupSchema, SBA_SCHEMA_VERSION } from "../schema";

function cloneFixture() {
  return structuredClone(genericAnsweringPlanFixture);
}

const requestFieldToIntakeFieldId = {
  caller_name: "field_name",
  phone: "field_phone",
  email: "field_email",
  reason: "field_details",
  service_needed: "field_details",
  address: "field_details",
  urgency: "field_details",
  preferred_time: "field_preferred_time",
} satisfies Record<AnsweringSetup["requestCapture"]["fields"][number], string>;

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function mapRequestFields(fields: AnsweringSetup["requestCapture"]["fields"]) {
  const mapped = uniqueStrings(fields.map((field) => requestFieldToIntakeFieldId[field]));
  return mapped.length ? mapped : ["field_name", "field_phone", "field_details"];
}

function hasAddressValue(address: AnsweringSetup["business"]["address"]) {
  return Object.values(address).some((value) => Boolean(value));
}

function mapAfterHoursMode(
  mode: AnsweringSetup["hours"]["afterHours"]["mode"],
): "take_message" | "offer_next_available" | "transfer" | "custom" {
  if (mode === "urgent_only") return "transfer";
  if (mode === "send_booking_link") return "offer_next_available";
  if (mode === "closed_message") return "custom";
  return "take_message";
}

export function answeringPlanToSetup(plan: AnsweringPlanEnvelope): AnsweringSetup {
  const document = plan.document;
  const contact = document.routing.contacts.find((item) => item.enabled) ?? document.routing.contacts[0];
  const bookingLink = document.links.find((link) => link.id === document.booking.bookingLinkId) ?? document.links.find((link) => link.type === "booking");

  return AnsweringSetupSchema.parse({
    ...structuredClone(demoAnsweringSetup),
    schemaVersion: SBA_SCHEMA_VERSION,
    setupId: plan.id.replace(/^plan_/, "setup_"),
    businessId: plan.businessId,
    status: {
      ...demoAnsweringSetup.status,
      draftRevision: plan.revision,
      liveRevision: plan.publishedRevision,
      needsReview: plan.revision !== plan.publishedRevision,
    },
    business: {
      name: document.businessProfile.businessName ?? "Your Business",
      websiteUrl: document.businessProfile.websiteUrl,
      publicPhone: document.businessProfile.publicContact.phone,
      publicEmail: document.businessProfile.publicContact.email,
      timezone: document.businessProfile.timezone ?? "America/Chicago",
      primaryLanguage: document.businessProfile.primaryLanguage,
      additionalLanguages: document.businessProfile.additionalLanguages,
      pronunciation: document.businessProfile.businessNamePronunciation,
      address: document.businessProfile.address,
      serviceArea: {
        summary: document.locationsCoverage.callerFacingDescription,
        areas: document.locationsCoverage.serviceAreas.map((area) => area.label),
      },
    },
    services: document.offerings.filter((item) => item.enabled).map((offering) => ({
      id: offering.id.replace(/^offering_/, "service_"),
      enabled: offering.enabled,
      name: offering.name,
      approvedDescription: offering.description,
      aliases: offering.aliases,
      canAnswerQuestions: offering.canAnswerQuestions,
      canCaptureRequest: offering.requestable,
      appointmentEligible: offering.bookable || offering.canSendBookingLink,
      pricingWording: offering.pricing.approvedWording,
    })),
    approvedAnswers: document.knowledgeItems.filter((item) => item.enabled).map((item) => ({
      id: item.id.replace(/^knowledge_/, "answer_"),
      question: item.question,
      answer: item.answer,
      sourceIds: [],
      needsReview: false,
    })),
    hours: {
      timezone: document.hoursAvailability.timezone ?? document.businessProfile.timezone ?? "America/Chicago",
      regular: document.hoursAvailability.regularHours,
      temporaryUpdate: document.temporaryUpdates.find((item) => item.enabled)
        ? {
            title: document.temporaryUpdates.find((item) => item.enabled)!.title,
            message: document.temporaryUpdates.find((item) => item.enabled)!.message,
            expiresAt: document.temporaryUpdates.find((item) => item.enabled)!.expiresAt,
          }
        : null,
      afterHours: {
        enabled: document.hoursAvailability.afterHours.enabled,
        mode: document.hoursAvailability.afterHours.mode === "transfer" ? "urgent_only" : "take_message",
        callerWording: document.hoursAvailability.afterHours.callerWording,
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
      callerGreeting: document.greetingVoice.openingGreeting ?? `Thanks for calling ${document.businessProfile.businessName ?? "the business"}. How can I help today?`,
      unknownAnswerBehavior: "take_message_and_flag",
    },
    requestCapture: {
      fields: ["caller_name", "phone", "reason", "service_needed", "preferred_time"],
      callerSummaryWording: document.requestTypes[0]?.confirmationWording ?? "I have captured your request and will send the details to the team.",
    },
    appointmentHandling: {
      mode: document.booking.defaultMethod === "send_link" ? "send_booking_link" : "capture_request",
      bookingLinkUrl: bookingLink?.url ?? null,
      calendarIntegration: document.booking.integrationConnectionId ? "connected" : "none",
      doNotCallBookedUntilConfirmed: true,
    },
    urgentRouting: {
      enabled: true,
      detectionPhrases: ["emergency", "urgent"],
      collectFields: ["caller_name", "phone", "reason", "urgency"],
      transferEnabled: document.routing.rules.some((rule) => rule.enabled && (rule.afterHours.action === "transfer" || rule.duringBusinessHours.action === "transfer")),
      alertContactIds: contact ? [contact.id] : [],
    },
    ownerAlerts: {
      contacts: contact
        ? [
            {
              id: contact.id,
              role: "owner",
              name: contact.name,
              sms: contact.phone,
              email: contact.email,
              enabled: contact.enabled,
            },
          ]
        : [],
      channels: document.followUps.some((rule) => rule.channel === "sms") ? ["sms"] : ["email"],
      messageTemplate: document.followUps[0]?.messageText ?? "New call from {{caller_name}} about {{reason}}.",
    },
  });
}

export function setupToAnsweringPlanEnvelope(setup: AnsweringSetup): AnsweringPlanEnvelope {
  const next = cloneFixture();
  const offeringIds = setup.services.map((service) => service.id.replace(/^service_/, "offering_"));
  const requestIntakeIds = mapRequestFields(setup.requestCapture.fields);
  const messageIntakeIds = uniqueStrings(["field_name", "field_phone", "field_details", ...requestIntakeIds.filter((id) => id === "field_email")]);
  const enabledContactIds = setup.ownerAlerts.contacts.filter((contact) => contact.enabled).map((contact) => contact.id);
  const bookingLinkUrl = setup.appointmentHandling.bookingLinkUrl;
  const bookingLinkId = bookingLinkUrl ? "link_booking" : null;
  const businessHasAddress = hasAddressValue(setup.business.address);
  const locationIds = businessHasAddress ? ["location_business"] : [];
  const serviceAreaLabels = setup.business.serviceArea.areas.filter((area) => area.trim().length > 0);
  const appointmentCompletionMode = setup.appointmentHandling.mode === "send_booking_link"
    ? "send_link"
    : setup.appointmentHandling.mode === "calendar_booking"
      ? "book"
      : "create_request";

  next.id = setup.setupId.replace(/^setup_/, "plan_");
  next.businessId = setup.businessId;
  next.revision = setup.status.draftRevision;
  next.publishedRevision = setup.status.liveRevision > 0 ? setup.status.liveRevision : null;
  next.updatedAt = new Date().toISOString();
  next.fieldMetadata = {};
  next.document.businessProfile.businessName = setup.business.name;
  next.document.businessProfile.legalName = null;
  next.document.businessProfile.websiteUrl = setup.business.websiteUrl;
  next.document.businessProfile.businessType = {
    label: "Small business",
    description: "Business configured through Small Business Answering.",
    aliases: [],
  };
  next.document.businessProfile.publicContact.phone = setup.business.publicPhone;
  next.document.businessProfile.publicContact.email = setup.business.publicEmail;
  next.document.businessProfile.publicContact.contactUrl = setup.business.websiteUrl;
  next.document.businessProfile.timezone = setup.business.timezone;
  next.document.businessProfile.primaryLanguage = setup.business.primaryLanguage;
  next.document.businessProfile.additionalLanguages = setup.business.additionalLanguages;
  next.document.businessProfile.businessNamePronunciation = setup.business.pronunciation;
  next.document.businessProfile.address = setup.business.address;
  next.document.businessProfile.description = setup.services[0]?.approvedDescription ?? null;
  next.document.offerings = setup.services.map((service, index) => ({
    id: offeringIds[index],
    enabled: service.enabled,
    name: service.name,
    title: null,
    description: service.approvedDescription,
    aliases: service.aliases,
    canAnswerQuestions: service.canAnswerQuestions,
    requestable: service.canCaptureRequest,
    bookable: service.appointmentEligible && setup.appointmentHandling.mode === "calendar_booking",
    canSendBookingLink: service.appointmentEligible && setup.appointmentHandling.mode === "send_booking_link",
    pricing: {
      mode: service.pricingWording ? "approved_custom_wording" : "do_not_quote",
      currency: "USD",
      startingPrice: null,
      minimumPrice: null,
      maximumPrice: null,
      fixedPrice: null,
      approvedWording: service.pricingWording,
    },
    requestTypeId: "request_callback",
    intakeFieldIds: requestIntakeIds,
    locationIds,
    linkIds: bookingLinkId && service.appointmentEligible ? [bookingLinkId] : [],
    additionalInstructions: null,
  }));
  next.document.knowledgeItems = setup.approvedAnswers.map((answer) => ({
    id: answer.id.replace(/^answer_/, "knowledge_"),
    enabled: true,
    type: "faq",
    title: answer.question,
    question: answer.question,
    alternativeQuestions: [],
    answer: answer.answer,
    behavior: { mode: "answer_directly", linkId: null, routingRuleId: null },
    appliesTo: { offeringIds: [], locationIds: [] },
    internalNotes: answer.needsReview ? "Needs owner review." : null,
  }));
  next.document.temporaryUpdates = setup.hours.temporaryUpdate
    ? [
        {
          id: "temporary_owner_update",
          enabled: true,
          title: setup.hours.temporaryUpdate.title,
          message: setup.hours.temporaryUpdate.message,
          mentionWhen: "when_relevant",
          startsAt: null,
          expiresAt: setup.hours.temporaryUpdate.expiresAt,
          removeAutomatically: true,
        },
      ]
    : [];
  next.document.hoursAvailability.timezone = setup.hours.timezone;
  next.document.hoursAvailability.regularHours = {
    monday: { open: setup.hours.regular.monday.open, periods: setup.hours.regular.monday.periods, note: setup.hours.regular.monday.callerWording },
    tuesday: { open: setup.hours.regular.tuesday.open, periods: setup.hours.regular.tuesday.periods, note: setup.hours.regular.tuesday.callerWording },
    wednesday: { open: setup.hours.regular.wednesday.open, periods: setup.hours.regular.wednesday.periods, note: setup.hours.regular.wednesday.callerWording },
    thursday: { open: setup.hours.regular.thursday.open, periods: setup.hours.regular.thursday.periods, note: setup.hours.regular.thursday.callerWording },
    friday: { open: setup.hours.regular.friday.open, periods: setup.hours.regular.friday.periods, note: setup.hours.regular.friday.callerWording },
    saturday: { open: setup.hours.regular.saturday.open, periods: setup.hours.regular.saturday.periods, note: setup.hours.regular.saturday.callerWording },
    sunday: { open: setup.hours.regular.sunday.open, periods: setup.hours.regular.sunday.periods, note: setup.hours.regular.sunday.callerWording },
  };
  next.document.hoursAvailability.afterHours.enabled = setup.hours.afterHours.enabled;
  next.document.hoursAvailability.afterHours.mode = mapAfterHoursMode(setup.hours.afterHours.mode);
  next.document.hoursAvailability.afterHours.instructions = setup.hours.afterHours.urgentWording ?? setup.hours.afterHours.callerWording;
  next.document.hoursAvailability.afterHours.callerWording = setup.hours.afterHours.callerWording;
  next.document.hoursAvailability.afterHours.routingRuleId = setup.urgentRouting.transferEnabled && enabledContactIds.length ? "routing_urgent" : null;
  next.document.hoursAvailability.availabilityNotes = setup.hours.afterHours.urgentWording;
  next.document.locationsCoverage = {
    enabled: businessHasAddress || serviceAreaLabels.length > 0 || Boolean(setup.business.serviceArea.summary),
    mode: businessHasAddress && (serviceAreaLabels.length > 0 || setup.business.serviceArea.summary)
      ? "hybrid"
      : businessHasAddress
        ? "single_location"
        : serviceAreaLabels.length > 0 || setup.business.serviceArea.summary
          ? "service_area"
          : "not_applicable",
    locations: businessHasAddress
      ? [
          {
            id: "location_business",
            enabled: true,
            name: setup.business.name,
            description: null,
            address: setup.business.address,
            phone: setup.business.publicPhone,
            email: setup.business.publicEmail,
            hoursOverride: null,
            offeringIds,
            bookingLinkId,
            routingRuleId: null,
          },
        ]
      : [],
    serviceAreas: serviceAreaLabels.map((area, index) => ({
      id: `service_area_${index + 1}`,
      enabled: true,
      type: "custom",
      label: area,
      value: area,
      excluded: false,
    })),
    callerFacingDescription: setup.business.serviceArea.summary,
  };
  next.document.booking.enabled = setup.appointmentHandling.mode !== "capture_request";
  next.document.booking.defaultMethod = setup.appointmentHandling.mode === "send_booking_link" ? "send_link" : "collect_preferred_time";
  next.document.booking.bookingLinkId = bookingLinkId;
  next.document.booking.integrationConnectionId = setup.appointmentHandling.calendarIntegration === "connected" ? "calendar_connected" : null;
  next.document.booking.defaultIntakeFieldIds = requestIntakeIds;
  next.document.booking.confirmationWording = setup.requestCapture.callerSummaryWording;
  next.document.booking.unavailableBehavior = {
    mode: "collect_preferred_time",
    wording: setup.requestCapture.callerSummaryWording,
  };
  next.document.booking.offeringOverrides = [];
  next.document.greetingVoice.openingGreeting = setup.callHandling.callerGreeting;
  next.document.greetingVoice.assistantName = setup.brand;
  next.document.greetingVoice.primaryLanguage = setup.business.primaryLanguage;
  next.document.greetingVoice.additionalLanguages = setup.business.additionalLanguages;
  next.document.greetingVoice.businessNamePronunciation = setup.business.pronunciation;
  next.document.greetingVoice.voicePreviewText = setup.callHandling.callerGreeting;
  next.document.unknownHandling.callerWording = setup.callHandling.unknownAnswerBehavior === "route_to_owner"
    ? "I do not have that confirmed. I can alert the business and have them follow up."
    : "I do not have that confirmed, but I can take a message for the team.";
  next.document.unknownHandling.defaultAction = setup.callHandling.unknownAnswerBehavior === "route_to_owner" && enabledContactIds.length ? "notify" : "take_message";
  next.document.unknownHandling.collectFieldIds = messageIntakeIds;
  next.document.unknownHandling.notifyRecipientIds = enabledContactIds;
  next.document.globalRules.confirmBeforeCreatingRequest = setup.appointmentHandling.doNotCallBookedUntilConfirmed;
  next.document.spamScreening.enabled = setup.spamScreening.enabled;
  next.document.spamScreening.blockLikelyRobocalls = setup.spamScreening.enabled;
  next.document.spamScreening.hideLikelySpamFromCalls = setup.spamScreening.enabled;
  next.document.spamScreening.countBlockedTowardUsage = !setup.spamScreening.keepOutOfBillableUsage;
  next.document.spamScreening.suspectedSpamAction = setup.spamScreening.enabled ? "screen" : "allow";
  next.document.routing.contacts = setup.ownerAlerts.contacts.map((contact) => ({
    id: contact.id,
    enabled: contact.enabled,
    name: contact.name,
    roleLabel: contact.role.replaceAll("_", " "),
    phone: contact.sms,
    email: contact.email,
    availabilityNote: null,
    notificationPreferences: {
      sms: Boolean(contact.sms),
      email: Boolean(contact.email),
      call: Boolean(contact.sms),
    },
  }));
  next.document.routing.teams = enabledContactIds.length
    ? [
        {
          id: "team_owner_alerts",
          enabled: true,
          name: "Owner alerts",
          description: "Contacts configured in Small Business Answering.",
          contactIds: enabledContactIds,
        },
      ]
    : [];
  next.document.routing.rules = setup.urgentRouting.transferEnabled && enabledContactIds.length
    ? [
        {
          id: "routing_urgent",
          enabled: true,
          name: "Urgent calls",
          appliesWhen: {
            scenarioIds: ["scenario_message"],
            requestTypeIds: ["request_callback"],
            locationIds,
            timeMode: "any",
            customCondition: setup.urgentRouting.detectionPhrases.length
              ? `Caller mentions: ${setup.urgentRouting.detectionPhrases.join(", ")}`
              : "Caller indicates the request is urgent.",
          },
          duringBusinessHours: { action: "transfer", recipientIds: enabledContactIds, instruction: setup.hours.afterHours.urgentWording },
          afterHours: { action: "transfer", recipientIds: enabledContactIds, instruction: setup.hours.afterHours.urgentWording },
          transferSequence: enabledContactIds.map((recipientId) => ({ recipientId, waitSeconds: 20 })),
          ifUnanswered: { action: "take_message_and_notify", recipientIds: enabledContactIds, instruction: setup.requestCapture.callerSummaryWording },
          notifyRecipientIds: enabledContactIds,
          callerWording: setup.hours.afterHours.urgentWording,
        },
      ]
    : [];
  next.document.links = bookingLinkUrl
    ? [
        {
          id: "link_booking",
          enabled: true,
          label: "Booking link",
          type: "booking",
          url: bookingLinkUrl,
          description: "Used when a caller asks for booking or appointment scheduling.",
        },
      ]
    : [];
  next.document.requestTypes = next.document.requestTypes.map((requestType) => {
    if (requestType.id === "request_consultation") {
      return {
        ...requestType,
        intakeFieldIds: requestIntakeIds,
        completionMode: appointmentCompletionMode,
        defaultAssigneeContactIds: enabledContactIds,
        confirmationWording: setup.requestCapture.callerSummaryWording,
      };
    }
    if (requestType.id === "request_callback") {
      return {
        ...requestType,
        intakeFieldIds: messageIntakeIds,
        defaultAssigneeContactIds: enabledContactIds,
        confirmationWording: setup.requestCapture.callerSummaryWording,
      };
    }
    return requestType;
  });
  const informationScenario = next.document.scenarios.find((scenario) => scenario.id === "scenario_information");
  if (informationScenario) {
    informationScenario.actions = [
      { type: "answer_approved_information", knowledgeItemIds: next.document.knowledgeItems.map((item) => item.id) },
    ];
  }
  const bookingScenario = next.document.scenarios.find((scenario) => scenario.id === "scenario_booking");
  if (bookingScenario) {
    const actions: ScenarioAction[] = [
      { type: "collect_information", intakeFieldIds: requestIntakeIds },
      { type: "create_request", requestTypeId: "request_consultation" },
    ];
    if (bookingLinkId && setup.appointmentHandling.mode === "send_booking_link") {
      actions.push({ type: "prepare_follow_up", followUpId: "followup_booking_link" });
    }
    bookingScenario.actions = actions;
    bookingScenario.collectFieldIds = requestIntakeIds;
    bookingScenario.notifyRecipientIds = enabledContactIds;
  }
  const messageScenario = next.document.scenarios.find((scenario) => scenario.id === "scenario_message");
  if (messageScenario) {
    const actions: ScenarioAction[] = [{ type: "take_message", intakeFieldIds: messageIntakeIds }];
    if (enabledContactIds.length) actions.push({ type: "notify", recipientIds: enabledContactIds });
    messageScenario.actions = actions;
    messageScenario.collectFieldIds = messageIntakeIds;
    messageScenario.notifyRecipientIds = enabledContactIds;
  }
  next.document.followUps = [];
  if (bookingLinkId && setup.callerConfirmations.sendBookingLinkWhenRelevant) {
    next.document.followUps.push({
      id: "followup_booking_link",
      enabled: true,
      name: "Booking link requested",
      trigger: "booking_link_requested",
      scenarioIds: ["scenario_booking"],
      channel: "sms",
      recipientType: "caller",
      recipientIds: [],
      messageText: setup.callerConfirmations.smsTemplate ?? "Here is the booking link: {{booking_link}}",
      includeLink: true,
      linkId: bookingLinkId,
      notifyOwner: false,
      sendingWindow: { mode: "anytime", customRule: null },
    });
  }
  if (enabledContactIds.length && setup.ownerAlerts.channels.length) {
    next.document.followUps.push({
      id: "followup_owner_alert",
      enabled: true,
      name: "Owner alert",
      trigger: "request_captured",
      scenarioIds: ["scenario_booking", "scenario_message"],
      channel: setup.ownerAlerts.channels.includes("sms") ? "sms" : "email",
      recipientType: "contact",
      recipientIds: enabledContactIds,
      messageText: setup.ownerAlerts.messageTemplate,
      includeLink: false,
      linkId: null,
      notifyOwner: true,
      sendingWindow: { mode: "anytime", customRule: null },
    });
  }
  return AnsweringPlanEnvelopeSchema.parse(next);
}
