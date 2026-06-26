import type { SetupAssistantResult } from "@/integrations/gemini/setup-assistant";
import type { AnsweringSetup } from "./schema";

function proposalId() {
  return `setup_proposal_${Date.now()}`;
}

export function runSmallBusinessSetupMockAssistant(
  setup: AnsweringSetup,
  instruction: string,
): SetupAssistantResult {
  const normalized = instruction.trim().toLowerCase();

  if (/what.*(price|pricing|cost)/.test(normalized)) {
    const summary = setup.services
      .filter((service) => service.enabled)
      .map((service) => `${service.name}: ${service.pricingWording ?? "do not quote pricing"}`)
      .join("; ");
    return {
      type: "answer",
      answer: summary || "No services have pricing wording yet.",
      setupPaths: ["/services"],
    };
  }

  if (/what.*after.?hours|what happens after/.test(normalized)) {
    return {
      type: "answer",
      answer: `After hours currently uses ${setup.hours.afterHours.mode.replaceAll("_", " ")}. ${setup.hours.afterHours.callerWording ?? ""}`.trim(),
      setupPaths: ["/hours/afterHours"],
    };
  }

  if (/(mark|complete|archive|delete|book|contacted|change status).*(request|appointment|message|call)/.test(normalized)) {
    return {
      type: "answer",
      answer: "Captured calls, requests, appointments, and messages are dashboard records. I can update the answering setup that controls future calls, but direct record status changes need the request or appointment workflow.",
      setupPaths: [],
    };
  }

  if (/appointment.*(mode|handling)|how.*appointment/.test(normalized)) {
    return {
      type: "answer",
      answer: `Appointments currently use ${setup.appointmentHandling.mode.replaceAll("_", " ")}. Booking link: ${setup.appointmentHandling.bookingLinkUrl ?? "not configured"}.`,
      setupPaths: ["/appointmentHandling"],
    };
  }

  if (/don.?t (quote|mention).*price|never (quote|mention).*price/.test(normalized)) {
    const operations = setup.services.map((service, index) => ({
      op: "replace" as const,
      path: `/services/${index}/pricingWording`,
      value: null,
    }));
    return {
      type: "proposal",
      proposal: {
        id: proposalId(),
        baseRevision: setup.status.draftRevision,
        source: "setup_assistant",
        summary: "Do not quote pricing for services",
        userInstruction: instruction,
        riskLevel: "high",
        requiresConfirmation: true,
        operations,
        affectedPaths: operations.map((operation) => operation.path),
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
        id: proposalId(),
        baseRevision: setup.status.draftRevision,
        source: "setup_assistant",
        summary: "Add warranty answer",
        userInstruction: instruction,
        riskLevel: "medium",
        requiresConfirmation: true,
        operations: [
          {
            op: "add",
            path: "/approvedAnswers/-",
            value: {
              id: `answer_warranty_${Date.now()}`,
              question: "Do you provide a warranty?",
              answer: answer || instruction,
              sourceIds: [],
              needsReview: false,
            },
          },
        ],
        affectedPaths: ["/approvedAnswers"],
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
        id: proposalId(),
        baseRevision: setup.status.draftRevision,
        source: "setup_assistant",
        summary: `Change Friday closing time to ${value}`,
        userInstruction: instruction,
        riskLevel: "medium",
        requiresConfirmation: true,
        operations: [{ op: "replace", path: "/hours/regular/friday/periods/0/closesAt", value }],
        affectedPaths: ["/hours/regular/friday/periods/0/closesAt"],
        conflicts: [],
        clarification: null,
      },
    };
  }

  return {
    type: "clarification",
    question: "Which part of the answering setup should this change affect?",
    choices: ["Business details", "Services and answers", "Hours and after-hours", "Owner alerts"],
    reason: "The safe mock assistant could not resolve the request to one canonical setup path.",
  };
}
