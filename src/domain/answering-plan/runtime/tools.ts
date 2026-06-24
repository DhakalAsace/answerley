import type { AnsweringPlanEnvelope } from "../schema";
import type { LiveToolDefinition } from "./schema";

const objectParameters = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export function buildLiveToolManifest(
  plan: AnsweringPlanEnvelope,
  mode: "test" | "live",
): LiveToolDefinition[] {
  const hasRequests = plan.document.requestTypes.some((item) => item.enabled);
  const hasFollowUps = plan.document.followUps.some((item) => item.enabled);
  const hasOwnerAlerts = plan.document.followUps.some(
    (item) => item.enabled && ["owner_alert", "new_lead", "important_call", "request_captured"].includes(item.trigger),
  );
  const hasTransfers =
    plan.document.routing.enabled &&
    plan.document.routing.rules.some(
      (rule) =>
        rule.enabled &&
        (rule.duringBusinessHours.action === "transfer" ||
          rule.afterHours.action === "transfer" ||
          rule.transferSequence.length > 0),
    );

  const tools: LiveToolDefinition[] = [
    {
      name: "record_collected_field",
      enabled: true,
      mode: "both",
      description: "Stores one caller-provided intake value against the active call.",
      invocationCondition: "Invoke immediately after the caller provides a configured intake field that has not already been stored.",
      parameters: objectParameters(
        {
          fieldId: { type: "string", description: "Configured intake field ID." },
          value: { description: "Caller-provided value in its natural structured form." },
          confirmed: { type: "boolean", description: "Whether the caller confirmed the value." },
        },
        ["fieldId", "value", "confirmed"],
      ),
      successMeaning: "The value is available to later request, message, and summary tools.",
      failureBehavior: "Apologize briefly, keep the value in conversation context, and retry once only if it is necessary.",
    },
    {
      name: "create_request",
      enabled: hasRequests,
      mode: "both",
      description: "Creates a structured test or live request using one enabled request type.",
      invocationCondition: "Invoke only after all required intake fields for the selected request type have been collected and the caller has confirmed the request details when confirmation is configured.",
      parameters: objectParameters(
        {
          requestTypeId: { type: "string" },
          offeringId: { type: ["string", "null"] },
          collectedFields: { type: "object", additionalProperties: true },
          callerSummary: { type: "string" },
        },
        ["requestTypeId", "collectedFields", "callerSummary"],
      ),
      successMeaning: mode === "test" ? "A test request appears in the action preview and later in the Calls record." : "A live request is stored and appears in Requests and Call Detail.",
      failureBehavior: "Tell the caller the details were captured for follow-up, then call capture_message if available.",
    },
    {
      name: "capture_message",
      enabled: true,
      mode: "both",
      description: "Captures a caller message and callback details for the business.",
      invocationCondition: "Invoke when the caller asks to leave a message, when an enabled scenario says to take a message, or when unknown handling falls back to taking a message.",
      parameters: objectParameters(
        {
          message: { type: "string" },
          callerName: { type: ["string", "null"] },
          callbackNumber: { type: ["string", "null"] },
          relatedRequestTypeId: { type: ["string", "null"] },
        },
        ["message"],
      ),
      successMeaning: "The message is shown in the call action stream and stored with the call.",
      failureBehavior: "Retain the message in conversation context and include it in end_call_with_summary.",
    },
    {
      name: "prepare_follow_up",
      enabled: hasFollowUps,
      mode: "both",
      description: "Prepares or sends one configured caller follow-up using an enabled follow-up rule.",
      invocationCondition: "Invoke only when the exact configured trigger occurs and any required recipient or link information is available.",
      parameters: objectParameters(
        {
          followUpId: { type: "string" },
          recipient: { type: ["string", "null"] },
          variables: { type: "object", additionalProperties: true },
        },
        ["followUpId", "variables"],
      ),
      successMeaning: mode === "test" ? "The follow-up appears as prepared in the action preview; nothing external is sent." : "The follow-up is queued and its delivery status is recorded.",
      failureBehavior: "Do not claim delivery. Continue the call and include the failure in the call summary.",
    },
    {
      name: "prepare_owner_alert",
      enabled: hasOwnerAlerts,
      mode: "both",
      description: "Prepares or sends a configured business-contact alert for the current call.",
      invocationCondition: "Invoke only when an enabled owner/team alert rule matches the call outcome or scenario.",
      parameters: objectParameters(
        {
          followUpId: { type: "string" },
          recipientIds: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
          urgency: { type: "string", enum: ["normal", "important", "urgent"] },
        },
        ["followUpId", "recipientIds", "summary", "urgency"],
      ),
      successMeaning: mode === "test" ? "The alert appears as prepared in the action preview." : "The alert is queued and recorded in Messages.",
      failureBehavior: "Do not claim the business was notified. Include the failed alert in the final summary.",
    },
    {
      name: "lookup_current_plan_info",
      enabled: true,
      mode: "both",
      description: "Looks up current approved Answering Plan information when the compiled runtime is insufficient or the plan changed during the session.",
      invocationCondition: "Invoke only when the caller asks for a business fact or behavior that is not clearly present in the current context, or when the application indicates a newer plan revision exists.",
      parameters: objectParameters(
        {
          question: { type: "string" },
          relevantPlanPaths: { type: "array", items: { type: "string" } },
        },
        ["question"],
      ),
      successMeaning: "The returned approved information may be used exactly within its stated scope.",
      failureBehavior: "Follow unknown handling. Do not answer from general knowledge.",
    },
    {
      name: "record_unknown_question",
      enabled: plan.document.unknownHandling.createImprovementSuggestion,
      mode: "both",
      description: "Stores a caller question that did not have a confirmed answer so the business can improve the plan later.",
      invocationCondition: "Invoke when lookup_current_plan_info cannot find a confirmed answer and unknown handling is used.",
      parameters: objectParameters(
        {
          question: { type: "string" },
          fallbackUsed: { type: "string" },
        },
        ["question", "fallbackUsed"],
      ),
      successMeaning: "The question appears as a plan-improvement opportunity linked to the call.",
      failureBehavior: "Continue using the configured unknown-handling behavior.",
    },
    {
      name: "simulate_transfer",
      enabled: mode === "test" && hasTransfers,
      mode: "test",
      description: "Creates a visible test-mode transfer event without placing a real call.",
      invocationCondition: "Invoke in test mode when an enabled routing rule would transfer a live caller.",
      parameters: objectParameters(
        {
          routingRuleId: { type: "string" },
          recipientIds: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
        ["routingRuleId", "recipientIds", "reason"],
      ),
      successMeaning: "A transfer-prepared card appears in the test action stream.",
      failureBehavior: "Use the routing rule's unanswered or fallback behavior.",
    },
    {
      name: "transfer_call",
      enabled: mode === "live" && hasTransfers,
      mode: "live",
      description: "Attempts a live transfer using one enabled routing rule and its configured sequence.",
      invocationCondition: "Invoke only in live mode when an enabled routing rule unmistakably applies and the required recipient phone numbers are available.",
      parameters: objectParameters(
        {
          routingRuleId: { type: "string" },
          reason: { type: "string" },
        },
        ["routingRuleId", "reason"],
      ),
      successMeaning: "A transfer attempt is initiated and its actual status is returned.",
      failureBehavior: "Follow the routing rule's unanswered behavior and never claim a person answered unless the tool confirms it.",
    },
    {
      name: "end_call_with_summary",
      enabled: true,
      mode: "both",
      description: "Finalizes the call record with a concise summary, outcome, collected information, and actions.",
      invocationCondition: "Invoke once when the caller is finished or the conversation ends. Do not invoke before outstanding required actions are attempted.",
      parameters: objectParameters(
        {
          summary: { type: "string" },
          outcome: { type: "string" },
          urgency: { type: "string", enum: ["normal", "important", "urgent"] },
          collectedFields: { type: "object", additionalProperties: true },
          actionIds: { type: "array", items: { type: "string" } },
        },
        ["summary", "outcome", "urgency", "collectedFields", "actionIds"],
      ),
      successMeaning: "The completed call appears in Calls with linked transcript, actions, requests, and messages.",
      failureBehavior: "Allow the transport to close the call and mark it for summary recovery.",
    },
  ];

  return tools.filter((tool) => tool.enabled);
}
