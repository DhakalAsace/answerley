import type { AnsweringPlanDocument } from "./schema";

export interface PlanIntegrityIssue {
  code: string;
  path: string;
  message: string;
}

export class PlanIntegrityError extends Error {
  constructor(public readonly issues: PlanIntegrityIssue[]) {
    super(`Answering Plan integrity failed: ${issues.map((item) => item.message).join("; ")}`);
  }
}

export function validatePlanIntegrity(document: AnsweringPlanDocument): PlanIntegrityIssue[] {
  const issues: PlanIntegrityIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  const ensureUnique = (values: string[], path: string, label: string) => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) add("duplicate-id", path, `${label} contains duplicate identifier “${value}”.`);
      seen.add(value);
    }
  };

  ensureUnique(document.temporaryUpdates.map((item) => item.id), "/temporaryUpdates", "Temporary updates");
  ensureUnique(document.offerings.map((item) => item.id), "/offerings", "Offerings");
  ensureUnique(document.locationsCoverage.locations.map((item) => item.id), "/locationsCoverage/locations", "Locations");
  ensureUnique(document.locationsCoverage.serviceAreas.map((item) => item.id), "/locationsCoverage/serviceAreas", "Service areas");
  ensureUnique(document.knowledgeItems.map((item) => item.id), "/knowledgeItems", "Knowledge items");
  ensureUnique(document.requestTypes.map((item) => item.id), "/requestTypes", "Request types");
  ensureUnique(document.intakeFields.map((item) => item.id), "/intakeFields", "Intake fields");
  ensureUnique(document.intakeFields.map((item) => item.key), "/intakeFields", "Intake field keys");
  ensureUnique(document.scenarios.map((item) => item.id), "/scenarios", "Scenarios");
  ensureUnique(document.routing.contacts.map((item) => item.id), "/routing/contacts", "Routing contacts");
  ensureUnique(document.routing.teams.map((item) => item.id), "/routing/teams", "Routing teams");
  ensureUnique(document.routing.rules.map((item) => item.id), "/routing/rules", "Routing rules");
  ensureUnique(document.followUps.map((item) => item.id), "/followUps", "Follow-up rules");
  ensureUnique(document.links.map((item) => item.id), "/links", "Links");

  const offeringIds = new Set(document.offerings.map((item) => item.id));
  const locationIds = new Set(document.locationsCoverage.locations.map((item) => item.id));
  const knowledgeIds = new Set(document.knowledgeItems.map((item) => item.id));
  const requestTypeIds = new Set(document.requestTypes.map((item) => item.id));
  const intakeFieldIds = new Set(document.intakeFields.map((item) => item.id));
  const scenarioIds = new Set(document.scenarios.map((item) => item.id));
  const contactIds = new Set(document.routing.contacts.map((item) => item.id));
  const teamIds = new Set(document.routing.teams.map((item) => item.id));
  const recipientIds = new Set([...contactIds, ...teamIds]);
  const routingRuleIds = new Set(document.routing.rules.map((item) => item.id));
  const followUpIds = new Set(document.followUps.map((item) => item.id));
  const linkIds = new Set(document.links.map((item) => item.id));

  for (const id of contactIds) {
    if (teamIds.has(id)) add("ambiguous-recipient-id", "/routing", `Recipient ID “${id}” is used by both a contact and a team.`);
  }

  const requireRef = (id: string | null | undefined, set: Set<string>, path: string, label: string) => {
    if (id && !set.has(id)) add("missing-reference", path, `${label} references missing identifier “${id}”.`);
  };
  const requireRefs = (ids: string[], set: Set<string>, path: string, label: string) => {
    ids.forEach((id) => requireRef(id, set, path, label));
  };

  document.offerings.forEach((item, index) => {
    requireRef(item.requestTypeId, requestTypeIds, `/offerings/${index}/requestTypeId`, `Offering ${item.name}`);
    requireRefs(item.intakeFieldIds, intakeFieldIds, `/offerings/${index}/intakeFieldIds`, `Offering ${item.name}`);
    requireRefs(item.locationIds, locationIds, `/offerings/${index}/locationIds`, `Offering ${item.name}`);
    requireRefs(item.linkIds, linkIds, `/offerings/${index}/linkIds`, `Offering ${item.name}`);
    if (item.pricing.mode === "range" && item.pricing.minimumPrice !== null && item.pricing.maximumPrice !== null && item.pricing.minimumPrice > item.pricing.maximumPrice) {
      add("invalid-price-range", `/offerings/${index}/pricing`, `${item.name} has a minimum price greater than its maximum price.`);
    }
  });

  document.locationsCoverage.locations.forEach((item, index) => {
    requireRefs(item.offeringIds, offeringIds, `/locationsCoverage/locations/${index}/offeringIds`, `Location ${item.name}`);
    requireRef(item.bookingLinkId, linkIds, `/locationsCoverage/locations/${index}/bookingLinkId`, `Location ${item.name}`);
    requireRef(item.routingRuleId, routingRuleIds, `/locationsCoverage/locations/${index}/routingRuleId`, `Location ${item.name}`);
  });

  document.knowledgeItems.forEach((item, index) => {
    requireRef(item.behavior.linkId, linkIds, `/knowledgeItems/${index}/behavior/linkId`, `Knowledge item ${item.title}`);
    requireRef(item.behavior.routingRuleId, routingRuleIds, `/knowledgeItems/${index}/behavior/routingRuleId`, `Knowledge item ${item.title}`);
    requireRefs(item.appliesTo.offeringIds, offeringIds, `/knowledgeItems/${index}/appliesTo/offeringIds`, `Knowledge item ${item.title}`);
    requireRefs(item.appliesTo.locationIds, locationIds, `/knowledgeItems/${index}/appliesTo/locationIds`, `Knowledge item ${item.title}`);
  });

  document.intakeFields.forEach((item, index) => {
    requireRefs(item.askWhen.requestTypeIds, requestTypeIds, `/intakeFields/${index}/askWhen/requestTypeIds`, `Intake field ${item.label}`);
    requireRefs(item.askWhen.offeringIds, offeringIds, `/intakeFields/${index}/askWhen/offeringIds`, `Intake field ${item.label}`);
    requireRefs(item.askWhen.scenarioIds, scenarioIds, `/intakeFields/${index}/askWhen/scenarioIds`, `Intake field ${item.label}`);
  });

  document.requestTypes.forEach((item, index) => {
    requireRefs(item.intakeFieldIds, intakeFieldIds, `/requestTypes/${index}/intakeFieldIds`, `Request type ${item.name}`);
    requireRefs(item.defaultAssigneeContactIds, contactIds, `/requestTypes/${index}/defaultAssigneeContactIds`, `Request type ${item.name}`);
    if (new Set(item.statuses).size !== item.statuses.length) add("duplicate-status", `/requestTypes/${index}/statuses`, `${item.name} contains duplicate request statuses.`);
  });

  requireRef(document.booking.bookingLinkId, linkIds, "/booking/bookingLinkId", "Booking");
  requireRefs(document.booking.defaultIntakeFieldIds, intakeFieldIds, "/booking/defaultIntakeFieldIds", "Booking");
  document.booking.offeringOverrides.forEach((item, index) => {
    requireRef(item.offeringId, offeringIds, `/booking/offeringOverrides/${index}/offeringId`, "Booking override");
    requireRef(item.bookingLinkId, linkIds, `/booking/offeringOverrides/${index}/bookingLinkId`, "Booking override");
    requireRefs(item.intakeFieldIds, intakeFieldIds, `/booking/offeringOverrides/${index}/intakeFieldIds`, "Booking override");
  });

  document.scenarios.forEach((item, index) => {
    requireRefs(item.appliesWhen.locationIds, locationIds, `/scenarios/${index}/appliesWhen/locationIds`, `Scenario ${item.name}`);
    requireRefs(item.appliesWhen.offeringIds, offeringIds, `/scenarios/${index}/appliesWhen/offeringIds`, `Scenario ${item.name}`);
    requireRefs(item.collectFieldIds, intakeFieldIds, `/scenarios/${index}/collectFieldIds`, `Scenario ${item.name}`);
    requireRef(item.requestTypeId, requestTypeIds, `/scenarios/${index}/requestTypeId`, `Scenario ${item.name}`);
    requireRefs(item.notifyRecipientIds, recipientIds, `/scenarios/${index}/notifyRecipientIds`, `Scenario ${item.name}`);
    requireRef(item.fallback.routingRuleId, routingRuleIds, `/scenarios/${index}/fallback/routingRuleId`, `Scenario ${item.name}`);

    item.actions.forEach((action, actionIndex) => {
      const path = `/scenarios/${index}/actions/${actionIndex}`;
      if (action.type === "answer_approved_information") requireRefs(action.knowledgeItemIds, knowledgeIds, `${path}/knowledgeItemIds`, `Scenario ${item.name}`);
      if (action.type === "collect_information" || action.type === "take_message") requireRefs(action.intakeFieldIds, intakeFieldIds, `${path}/intakeFieldIds`, `Scenario ${item.name}`);
      if (action.type === "create_request") requireRef(action.requestTypeId, requestTypeIds, `${path}/requestTypeId`, `Scenario ${item.name}`);
      if (action.type === "send_link") requireRef(action.linkId, linkIds, `${path}/linkId`, `Scenario ${item.name}`);
      if (action.type === "prepare_follow_up") requireRef(action.followUpId, followUpIds, `${path}/followUpId`, `Scenario ${item.name}`);
      if (action.type === "notify") requireRefs(action.recipientIds, recipientIds, `${path}/recipientIds`, `Scenario ${item.name}`);
      if (action.type === "transfer") requireRef(action.routingRuleId, routingRuleIds, `${path}/routingRuleId`, `Scenario ${item.name}`);
    });
  });

  document.routing.teams.forEach((team, index) => requireRefs(team.contactIds, contactIds, `/routing/teams/${index}/contactIds`, `Team ${team.name}`));
  document.routing.rules.forEach((rule, index) => {
    requireRefs(rule.appliesWhen.scenarioIds, scenarioIds, `/routing/rules/${index}/appliesWhen/scenarioIds`, `Routing rule ${rule.name}`);
    requireRefs(rule.appliesWhen.requestTypeIds, requestTypeIds, `/routing/rules/${index}/appliesWhen/requestTypeIds`, `Routing rule ${rule.name}`);
    requireRefs(rule.appliesWhen.locationIds, locationIds, `/routing/rules/${index}/appliesWhen/locationIds`, `Routing rule ${rule.name}`);
    requireRefs(rule.duringBusinessHours.recipientIds, recipientIds, `/routing/rules/${index}/duringBusinessHours/recipientIds`, `Routing rule ${rule.name}`);
    requireRefs(rule.afterHours.recipientIds, recipientIds, `/routing/rules/${index}/afterHours/recipientIds`, `Routing rule ${rule.name}`);
    requireRefs(rule.ifUnanswered.recipientIds, recipientIds, `/routing/rules/${index}/ifUnanswered/recipientIds`, `Routing rule ${rule.name}`);
    requireRefs(rule.transferSequence.map((step) => step.recipientId), contactIds, `/routing/rules/${index}/transferSequence`, `Routing rule ${rule.name}`);
    requireRefs(rule.notifyRecipientIds, recipientIds, `/routing/rules/${index}/notifyRecipientIds`, `Routing rule ${rule.name}`);
  });

  document.followUps.forEach((item, index) => {
    requireRefs(item.scenarioIds, scenarioIds, `/followUps/${index}/scenarioIds`, `Follow-up ${item.name}`);
    requireRefs(item.recipientIds, recipientIds, `/followUps/${index}/recipientIds`, `Follow-up ${item.name}`);
    requireRef(item.linkId, linkIds, `/followUps/${index}/linkId`, `Follow-up ${item.name}`);
  });

  requireRefs(document.unknownHandling.collectFieldIds, intakeFieldIds, "/unknownHandling/collectFieldIds", "Unknown handling");
  requireRefs(document.unknownHandling.notifyRecipientIds, recipientIds, "/unknownHandling/notifyRecipientIds", "Unknown handling");
  requireRef(document.unknownHandling.routingRuleId, routingRuleIds, "/unknownHandling/routingRuleId", "Unknown handling");
  requireRef(document.hoursAvailability.afterHours.routingRuleId, routingRuleIds, "/hoursAvailability/afterHours/routingRuleId", "After-hours handling");

  return issues;
}

export function assertPlanIntegrity(document: AnsweringPlanDocument) {
  const issues = validatePlanIntegrity(document);
  if (issues.length) throw new PlanIntegrityError(issues);
  return document;
}
