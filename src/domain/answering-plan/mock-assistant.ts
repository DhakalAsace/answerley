import type { AnsweringPlanEnvelope } from "./schema";
import type { PlanAssistantResult } from "@/integrations/gemini/plan-assistant";

export function runFoundationMockPlanAssistant(
  plan: AnsweringPlanEnvelope,
  instruction: string,
): PlanAssistantResult {
  const normalized = instruction.trim().toLowerCase();

  if (/what.*(pricing|price)/.test(normalized)) {
    const summary = plan.document.offerings
      .filter((item) => item.enabled)
      .map((item) => `${item.name}: ${item.pricing.mode.replaceAll("_", " ")}`)
      .join("; ");
    return {
      type: "answer",
      answer: summary || "No active offering has pricing behavior configured.",
      planPaths: ["/offerings"],
    };
  }

  if (/what.*after.?hours|what happens after/.test(normalized)) {
    return {
      type: "answer",
      answer: `After hours is enabled and currently uses: ${plan.document.hoursAvailability.afterHours.mode.replaceAll("_", " ")}. ${plan.document.hoursAvailability.afterHours.callerWording ?? ""}`.trim(),
      planPaths: ["/hoursAvailability/afterHours"],
    };
  }

  if (/don.?t bother me after hours|do not bother me after hours/.test(normalized)) {
    return {
      type: "clarification",
      question: "What should Answerley do after hours?",
      choices: [
        "Take a message without notifying me",
        "Send me a text but do not transfer",
        "Contact me only for important calls",
        "Use the same handling as business hours",
      ],
      reason: "The request could change transfers, alerts, and message handling in different ways.",
    };
  }

  if (/don.?t (quote|mention).*price|never (quote|mention).*price/.test(normalized)) {
    const operations = plan.document.offerings
      .map((offering, index) =>
        offering.enabled
          ? ({ op: "replace", path: `/offerings/${index}/pricing/mode`, value: "do_not_quote" } as const)
          : null,
      )
      .filter((value): value is NonNullable<typeof value> => value !== null);
    return {
      type: "proposal",
      proposal: {
        id: `proposal_${Date.now()}`,
        baseRevision: plan.revision,
        source: "plan_assistant",
        summary: "Do not quote pricing for active offerings",
        userInstruction: instruction,
        riskLevel: "high",
        requiresConfirmation: true,
        operations,
        affectedPaths: operations.map((item) => item.path),
        conflicts: [],
        clarification: null,
      },
    };
  }

  if (/turn off spam|disable spam/.test(normalized)) {
    return {
      type: "proposal",
      proposal: {
        id: `proposal_${Date.now()}`,
        baseRevision: plan.revision,
        source: "plan_assistant",
        summary: "Disable spam screening",
        userInstruction: instruction,
        riskLevel: "medium",
        requiresConfirmation: true,
        operations: [{ op: "replace", path: "/spamScreening/enabled", value: false }],
        affectedPaths: ["/spamScreening/enabled"],
        conflicts: [],
        clarification: null,
      },
    };
  }

  const closeMatch = normalized.match(/(?:close|closing).*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?.*friday|friday.*?(?:close|closing).*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (closeMatch) {
    const rawHour = Number(closeMatch[1] ?? closeMatch[4]);
    const minute = Number(closeMatch[2] ?? closeMatch[5] ?? 0);
    const meridiem = closeMatch[3] ?? closeMatch[6] ?? "pm";
    const hour = meridiem === "pm" && rawHour < 12 ? rawHour + 12 : meridiem === "am" && rawHour === 12 ? 0 : rawHour;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    return {
      type: "proposal",
      proposal: {
        id: `proposal_${Date.now()}`,
        baseRevision: plan.revision,
        source: "plan_assistant",
        summary: `Change Friday closing time to ${value}`,
        userInstruction: instruction,
        riskLevel: "medium",
        requiresConfirmation: true,
        operations: [
          {
            op: "replace",
            path: "/hoursAvailability/regularHours/friday/periods/0/closesAt",
            value,
          },
        ],
        affectedPaths: ["/hoursAvailability/regularHours/friday/periods/0/closesAt"],
        conflicts: [],
        clarification: null,
      },
    };
  }

  if (/warranty/.test(normalized) && /add|we (offer|provide|have)/.test(normalized)) {
    const answer = instruction
      .replace(/^.*?(?:add that|we offer|we provide|we have)\s*/i, "")
      .trim();
    return {
      type: "proposal",
      proposal: {
        id: `proposal_${Date.now()}`,
        baseRevision: plan.revision,
        source: "plan_assistant",
        summary: "Add warranty information",
        userInstruction: instruction,
        riskLevel: "medium",
        requiresConfirmation: true,
        operations: [
          {
            op: "add",
            path: "/knowledgeItems/-",
            value: {
              id: `knowledge_warranty_${Date.now()}`,
              enabled: true,
              type: "policy",
              title: "Warranty information",
              question: "Do you provide a warranty?",
              alternativeQuestions: ["Is there a warranty?"],
              answer: answer || instruction,
              behavior: { mode: "answer_directly", linkId: null, routingRuleId: null },
              appliesTo: { offeringIds: [], locationIds: [] },
              internalNotes: null,
            },
          },
        ],
        affectedPaths: ["/knowledgeItems"],
        conflicts: [],
        clarification: null,
      },
    };
  }

  return {
    type: "clarification",
    question: "Which part of the Answering Plan should this change affect?",
    choices: ["Business information", "Call handling", "Booking or intake", "Routing or notifications"],
    reason: "The foundation mock assistant could not resolve the request safely. The Gemini adapter handles open-ended requests when configured.",
  };
}
