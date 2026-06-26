import type { AnsweringSetup } from "./schema";

export interface SuggestedSetupTestPrompt {
  id: string;
  category: "approved_answer" | "service" | "appointment" | "message" | "urgent" | "unknown";
  prompt: string;
  sourceId: string | null;
}

export function generateSetupTestPrompts(setup: AnsweringSetup): SuggestedSetupTestPrompt[] {
  const prompts: SuggestedSetupTestPrompt[] = [];
  const answer = setup.approvedAnswers.find((item) => !item.needsReview) ?? setup.approvedAnswers[0];
  const service = setup.services.find((item) => item.enabled);

  if (answer) {
    prompts.push({
      id: "prompt_answer",
      category: "approved_answer",
      prompt: answer.question,
      sourceId: answer.id,
    });
  } else {
    prompts.push({
      id: "prompt_hours",
      category: "approved_answer",
      prompt: "Are you open this weekend?",
      sourceId: null,
    });
  }

  if (service) {
    prompts.push({
      id: "prompt_service",
      category: "service",
      prompt: `Can you tell me about ${service.name}?`,
      sourceId: service.id,
    });
  }

  prompts.push({
    id: "prompt_appointment",
    category: "appointment",
    prompt: "I would like to make an appointment request.",
    sourceId: null,
  });
  prompts.push({
    id: "prompt_message",
    category: "message",
    prompt: "Please ask someone to call me back.",
    sourceId: null,
  });
  prompts.push({
    id: "prompt_urgent",
    category: "urgent",
    prompt: "This is urgent and I need help as soon as possible.",
    sourceId: null,
  });
  prompts.push({
    id: "prompt_unknown",
    category: "unknown",
    prompt: "Ask a question that is not approved yet, then add the answer beside the call.",
    sourceId: null,
  });
  return prompts.slice(0, 6);
}
