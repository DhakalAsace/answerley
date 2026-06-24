import type { AnsweringPlanEnvelope } from "./schema";
import { getByJsonPointer, isMeaningfullyEmpty } from "./json-pointer";

export type DisplayFieldState =
  | "found"
  | "recommended"
  | "user_provided"
  | "confirmed"
  | "needs_confirmation"
  | "missing"
  | "conflict"
  | "not_applicable";

export function deriveFieldState(
  plan: AnsweringPlanEnvelope,
  path: string,
  options: { applicable?: boolean; required?: boolean } = {},
): DisplayFieldState {
  if (options.applicable === false) return "not_applicable";
  const metadata = plan.fieldMetadata[path];
  const value = getByJsonPointer(plan.document, path);

  if (metadata?.conflicts?.length) return "conflict";
  if (isMeaningfullyEmpty(value)) return options.required ? "missing" : "not_applicable";
  if (metadata?.confirmedByUser) return "confirmed";
  if (metadata?.sourceType === "user") return "user_provided";
  if (metadata?.sourceType === "answerley_default" || metadata?.sourceType === "assistant") {
    return metadata.confidence !== null && metadata.confidence < 0.75
      ? "needs_confirmation"
      : "recommended";
  }
  if (metadata?.sourceType === "website" || metadata?.sourceType === "google_business_profile") {
    return metadata.confidence !== null && metadata.confidence < 0.7
      ? "needs_confirmation"
      : "found";
  }
  return "found";
}

export interface SuggestedTestPrompt {
  id: string;
  category: "knowledge" | "offering" | "request" | "message" | "unknown";
  prompt: string;
  sourceId: string | null;
}

export function generateSuggestedTestPrompts(
  plan: AnsweringPlanEnvelope,
): SuggestedTestPrompt[] {
  const doc = plan.document;
  const prompts: SuggestedTestPrompt[] = [];
  const knowledge = doc.knowledgeItems.find((item) => item.enabled);
  const offering = doc.offerings.find((item) => item.enabled);
  const request = doc.requestTypes.find((item) => item.enabled);

  if (knowledge) {
    prompts.push({
      id: "prompt_knowledge",
      category: "knowledge",
      prompt: knowledge.question,
      sourceId: knowledge.id,
    });
  } else if (doc.hoursAvailability.enabled) {
    prompts.push({
      id: "prompt_hours",
      category: "knowledge",
      prompt: "Are you open on Saturday?",
      sourceId: null,
    });
  }

  if (offering) {
    prompts.push({
      id: "prompt_offering",
      category: "offering",
      prompt: `Can you tell me about ${offering.name}?`,
      sourceId: offering.id,
    });
  }

  if (request) {
    prompts.push({
      id: "prompt_request",
      category: "request",
      prompt: `I would like to make a ${request.singularLabel.toLowerCase()}.`,
      sourceId: request.id,
    });
  }

  prompts.push({
    id: "prompt_message",
    category: "message",
    prompt: "Please ask someone to call me back.",
    sourceId: null,
  });

  prompts.push({
    id: "prompt_unknown",
    category: "unknown",
    prompt: "Ask a question that is not on the website, then add the answer beside the call.",
    sourceId: null,
  });

  return prompts.slice(0, 5);
}
