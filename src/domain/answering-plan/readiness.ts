import type { AnsweringPlanEnvelope } from "./schema";
import type { PlanSectionId } from "./field-registry";
import { isMeaningfullyEmpty } from "./json-pointer";

export type ReadinessLevel = "critical" | "recommended" | "optional";

export interface ReadinessIssue {
  id: string;
  level: ReadinessLevel;
  section: PlanSectionId;
  path: string;
  title: string;
  description: string;
  resolutionHint: string;
}

export interface SectionReadiness {
  section: PlanSectionId;
  critical: number;
  recommended: number;
  status: "ready" | "needs_review" | "blocked";
}

export interface PlanReadinessReport {
  testReady: boolean;
  liveReady: boolean;
  issues: ReadinessIssue[];
  sections: SectionReadiness[];
  counts: {
    critical: number;
    recommended: number;
    optional: number;
  };
}

const issue = (
  id: string,
  level: ReadinessLevel,
  section: PlanSectionId,
  path: string,
  title: string,
  description: string,
  resolutionHint: string,
): ReadinessIssue => ({ id, level, section, path, title, description, resolutionHint });

export function calculatePlanReadiness(plan: AnsweringPlanEnvelope): PlanReadinessReport {
  const doc = plan.document;
  const issues: ReadinessIssue[] = [];

  if (isMeaningfullyEmpty(doc.businessProfile.businessName)) {
    issues.push(
      issue(
        "business-name",
        "critical",
        "businessProfile",
        "/businessProfile/businessName",
        "Business name is missing",
        "Answerley needs the caller-facing business name for the greeting and business answers.",
        "Add or confirm the business name.",
      ),
    );
  }

  const timeAwareBehavior =
    doc.hoursAvailability.enabled ||
    doc.hoursAvailability.afterHours.enabled ||
    doc.temporaryUpdates.some((update) => update.enabled) ||
    doc.followUps.some((rule) => rule.enabled && rule.sendingWindow.mode !== "anytime");

  if (timeAwareBehavior && isMeaningfullyEmpty(doc.businessProfile.timezone)) {
    issues.push(
      issue(
        "timezone",
        "critical",
        "businessProfile",
        "/businessProfile/timezone",
        "Timezone needs confirmation",
        "Hours, after-hours behavior, temporary updates, and sending windows depend on a timezone.",
        "Confirm the business timezone.",
      ),
    );
  }

  if (doc.greetingVoice.enabled && isMeaningfullyEmpty(doc.greetingVoice.openingGreeting)) {
    issues.push(
      issue(
        "opening-greeting",
        "critical",
        "greetingVoice",
        "/greetingVoice/openingGreeting",
        "Opening greeting is missing",
        "The voice assistant needs a greeting before it can handle live calls.",
        "Use the recommended greeting or add a custom greeting.",
      ),
    );
  }

  if (doc.greetingVoice.enabled && isMeaningfullyEmpty(doc.greetingVoice.voiceId)) {
    issues.push(
      issue(
        "voice-id",
        "recommended",
        "greetingVoice",
        "/greetingVoice/voiceId",
        "Choose a voice",
        "A default can be used for testing, but the business should choose a voice before activation.",
        "Preview and select a voice.",
      ),
    );
  }

  if (!doc.unknownHandling.enabled || isMeaningfullyEmpty(doc.unknownHandling.callerWording)) {
    issues.push(
      issue(
        "unknown-handling",
        "critical",
        "unknownHandling",
        "/unknownHandling",
        "Unknown-question handling is incomplete",
        "Answerley needs a safe behavior for questions that are not confirmed in the plan.",
        "Enable unknown handling and approve the caller wording.",
      ),
    );
  }

  if (doc.offerings.filter((offering) => offering.enabled).length === 0) {
    issues.push(
      issue(
        "no-offerings",
        "recommended",
        "offerings",
        "/offerings",
        "No active offerings",
        "The assistant can still take messages, but it will have less useful business context.",
        "Add at least one offering or confirm that this business does not use offerings.",
      ),
    );
  }

  for (const [index, offering] of doc.offerings.entries()) {
    if (!offering.enabled) continue;
    const path = `/offerings/${index}/pricing`;
    if (offering.pricing.mode === "starting_price" && offering.pricing.startingPrice === null) {
      issues.push(issue(`offering-${offering.id}-starting-price`, "critical", "offerings", path, `Starting price missing for ${offering.name}`, "Pricing is configured to quote a starting price, but no starting price is stored.", "Add the starting price or switch pricing behavior."));
    }
    if (
      offering.pricing.mode === "range" &&
      (offering.pricing.minimumPrice === null || offering.pricing.maximumPrice === null)
    ) {
      issues.push(issue(`offering-${offering.id}-range`, "critical", "offerings", path, `Price range incomplete for ${offering.name}`, "Both minimum and maximum prices are needed when range pricing is enabled.", "Complete the range or switch pricing behavior."));
    }
    if (offering.pricing.mode === "fixed" && offering.pricing.fixedPrice === null) {
      issues.push(issue(`offering-${offering.id}-fixed`, "critical", "offerings", path, `Fixed price missing for ${offering.name}`, "A fixed price is enabled without an amount.", "Add the fixed price or switch pricing behavior."));
    }
    if (
      offering.pricing.mode === "approved_custom_wording" &&
      isMeaningfullyEmpty(offering.pricing.approvedWording)
    ) {
      issues.push(issue(`offering-${offering.id}-wording`, "critical", "offerings", path, `Pricing wording missing for ${offering.name}`, "Custom pricing wording is enabled but no approved wording is stored.", "Add approved wording or switch pricing behavior."));
    }
  }

  if (doc.booking.enabled) {
    if (doc.booking.defaultMethod === "send_link" && !doc.booking.bookingLinkId) {
      issues.push(issue("booking-link", "critical", "booking", "/booking/bookingLinkId", "Booking link is missing", "Booking is configured to send a link, but no link is selected.", "Select or add a booking link."));
    }
    if (
      ["connected_calendar", "book_directly"].includes(doc.booking.defaultMethod) &&
      !doc.booking.integrationConnectionId
    ) {
      issues.push(issue("booking-integration", "critical", "booking", "/booking/integrationConnectionId", "Booking connection is missing", "The selected booking method requires a connected calendar or booking system.", "Connect a calendar or choose another booking method."));
    }
  }

  const enabledIntakeIds = new Set(
    doc.intakeFields.filter((field) => field.enabled).map((field) => field.id),
  );
  for (const requestType of doc.requestTypes.filter((item) => item.enabled)) {
    const missingIds = requestType.intakeFieldIds.filter((id) => !enabledIntakeIds.has(id));
    if (missingIds.length) {
      issues.push(issue(`request-${requestType.id}-fields`, "critical", "requestsIntake", `/requestTypes/${requestType.id}/intakeFieldIds`, `${requestType.name} references unavailable intake fields`, `Missing or disabled fields: ${missingIds.join(", ")}.`, "Enable, recreate, or remove the missing field references."));
    }
  }

  const enabledRequestIds = new Set(
    doc.requestTypes.filter((item) => item.enabled).map((item) => item.id),
  );
  const enabledLinkIds = new Set(doc.links.filter((item) => item.enabled).map((item) => item.id));
  const enabledFollowUpIds = new Set(
    doc.followUps.filter((item) => item.enabled).map((item) => item.id),
  );
  const enabledRoutingRuleIds = new Set(
    doc.routing.rules.filter((item) => item.enabled).map((item) => item.id),
  );
  for (const scenario of doc.scenarios.filter((item) => item.enabled)) {
    if (scenario.requestTypeId && !enabledRequestIds.has(scenario.requestTypeId)) {
      issues.push(issue(`scenario-${scenario.id}-request`, "critical", "scenarios", `/scenarios/${scenario.id}/requestTypeId`, `${scenario.name} references an unavailable request type`, "The scenario cannot create the intended request.", "Select an enabled request type or remove the reference."));
    }
    for (const action of scenario.actions) {
      if (action.type === "create_request" && !enabledRequestIds.has(action.requestTypeId)) {
        issues.push(issue(`scenario-${scenario.id}-action-request`, "critical", "scenarios", `/scenarios/${scenario.id}/actions`, `${scenario.name} has an invalid request action`, `Request type ${action.requestTypeId} is missing or disabled.`, "Choose an enabled request type."));
      }
      if (action.type === "send_link" && !enabledLinkIds.has(action.linkId)) {
        issues.push(issue(`scenario-${scenario.id}-action-link`, "critical", "scenarios", `/scenarios/${scenario.id}/actions`, `${scenario.name} has an invalid link action`, `Link ${action.linkId} is missing or disabled.`, "Choose an enabled link."));
      }
      if (action.type === "prepare_follow_up" && !enabledFollowUpIds.has(action.followUpId)) {
        issues.push(issue(`scenario-${scenario.id}-action-followup`, "critical", "scenarios", `/scenarios/${scenario.id}/actions`, `${scenario.name} has an invalid follow-up action`, `Follow-up ${action.followUpId} is missing or disabled.`, "Choose an enabled follow-up rule."));
      }
      if (action.type === "transfer" && !enabledRoutingRuleIds.has(action.routingRuleId)) {
        issues.push(issue(`scenario-${scenario.id}-action-transfer`, "critical", "scenarios", `/scenarios/${scenario.id}/actions`, `${scenario.name} has an invalid transfer action`, `Routing rule ${action.routingRuleId} is missing or disabled.`, "Choose an enabled routing rule."));
      }
    }
  }

  const contactMap = new Map(doc.routing.contacts.map((contact) => [contact.id, contact]));
  const transferRecipientIds = new Set<string>();
  for (const rule of doc.routing.rules.filter((item) => item.enabled)) {
    if (rule.duringBusinessHours.action === "transfer") {
      rule.duringBusinessHours.recipientIds.forEach((id) => transferRecipientIds.add(id));
    }
    if (rule.afterHours.action === "transfer") {
      rule.afterHours.recipientIds.forEach((id) => transferRecipientIds.add(id));
    }
    rule.transferSequence.forEach((step) => transferRecipientIds.add(step.recipientId));
  }

  for (const recipientId of transferRecipientIds) {
    const contact = contactMap.get(recipientId);
    if (!contact || !contact.enabled || isMeaningfullyEmpty(contact.phone)) {
      issues.push(issue(`transfer-contact-${recipientId}`, "critical", "routing", "/routing/contacts", "A transfer recipient needs a phone number", `Routing references ${contact?.name ?? recipientId}, but no enabled phone number is available.`, "Add a phone number or remove the recipient from transfer rules."));
    }
  }

  const notificationContactIds = new Set<string>();
  for (const followUp of doc.followUps.filter((item) => item.enabled)) {
    if (followUp.recipientType === "contact") {
      followUp.recipientIds.forEach((id) => notificationContactIds.add(id));
    }
    if (followUp.includeLink && (!followUp.linkId || !enabledLinkIds.has(followUp.linkId))) {
      issues.push(issue(`followup-${followUp.id}-link`, "critical", "followUps", `/followUps/${followUp.id}/linkId`, `${followUp.name} needs an active link`, "This message is configured to include a link, but no active link is selected.", "Select an active link or disable link inclusion."));
    }
  }

  for (const recipientId of notificationContactIds) {
    const contact = contactMap.get(recipientId);
    if (!contact || !contact.enabled) {
      issues.push(issue(`notification-contact-${recipientId}`, "critical", "routing", "/routing/contacts", "An alert recipient is unavailable", `A follow-up rule references ${contact?.name ?? recipientId}, but the contact is missing or disabled.`, "Enable the contact or update the follow-up rule."));
      continue;
    }
    const needsSms = doc.followUps.some(
      (rule) =>
        rule.enabled &&
        rule.channel === "sms" &&
        rule.recipientType === "contact" &&
        rule.recipientIds.includes(recipientId),
    );
    if (needsSms && isMeaningfullyEmpty(contact.phone)) {
      issues.push(issue(`notification-phone-${recipientId}`, "critical", "routing", "/routing/contacts", `${contact.name} needs a phone number`, "An enabled SMS alert rule uses this contact.", "Add the recipient phone number or change the alert channel."));
    }
  }

  for (const [path, metadata] of Object.entries(plan.fieldMetadata)) {
    if (!metadata.conflicts.length) continue;
    const critical =
      path.includes("businessName") ||
      path.includes("hoursAvailability") ||
      path.includes("pricing") ||
      path.includes("routing") ||
      path.includes("booking");
    issues.push(
      issue(
        `conflict-${path}`,
        critical ? "critical" : "recommended",
        sectionForPath(path),
        path,
        "Conflicting information needs review",
        `${metadata.conflicts.length + 1} different values were found for this field.`,
        "Choose the value Answerley should use.",
      ),
    );
  }

  const sectionIds: PlanSectionId[] = [
    "businessProfile",
    "temporaryUpdates",
    "offerings",
    "hoursAvailability",
    "locationsCoverage",
    "knowledgeItems",
    "requestsIntake",
    "booking",
    "scenarios",
    "routing",
    "followUps",
    "unknownHandling",
    "spamScreening",
    "greetingVoice",
    "links",
    "globalRules",
  ];

  const sections = sectionIds.map((section) => {
    const sectionIssues = issues.filter((item) => item.section === section);
    const critical = sectionIssues.filter((item) => item.level === "critical").length;
    const recommended = sectionIssues.filter((item) => item.level === "recommended").length;
    return {
      section,
      critical,
      recommended,
      status: critical > 0 ? "blocked" : recommended > 0 ? "needs_review" : "ready",
    } satisfies SectionReadiness;
  });

  const counts = {
    critical: issues.filter((item) => item.level === "critical").length,
    recommended: issues.filter((item) => item.level === "recommended").length,
    optional: issues.filter((item) => item.level === "optional").length,
  };

  return {
    testReady:
      !isMeaningfullyEmpty(doc.businessProfile.businessName) &&
      !isMeaningfullyEmpty(doc.greetingVoice.openingGreeting) &&
      doc.unknownHandling.enabled,
    liveReady: counts.critical === 0,
    issues,
    sections,
    counts,
  };
}

function sectionForPath(path: string): PlanSectionId {
  if (path.startsWith("/businessProfile")) return "businessProfile";
  if (path.startsWith("/temporaryUpdates")) return "temporaryUpdates";
  if (path.startsWith("/offerings")) return "offerings";
  if (path.startsWith("/hoursAvailability")) return "hoursAvailability";
  if (path.startsWith("/locationsCoverage")) return "locationsCoverage";
  if (path.startsWith("/knowledgeItems")) return "knowledgeItems";
  if (path.startsWith("/requestTypes") || path.startsWith("/intakeFields")) return "requestsIntake";
  if (path.startsWith("/booking")) return "booking";
  if (path.startsWith("/scenarios")) return "scenarios";
  if (path.startsWith("/routing")) return "routing";
  if (path.startsWith("/followUps")) return "followUps";
  if (path.startsWith("/unknownHandling")) return "unknownHandling";
  if (path.startsWith("/spamScreening")) return "spamScreening";
  if (path.startsWith("/greetingVoice")) return "greetingVoice";
  if (path.startsWith("/links")) return "links";
  return "globalRules";
}
