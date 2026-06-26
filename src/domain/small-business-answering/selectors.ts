import type { AnsweringSetup } from "./schema";

export type RequestCaptureField = AnsweringSetup["requestCapture"]["fields"][number];

export const requestCaptureFieldIds = [
  "caller_name",
  "phone",
  "email",
  "reason",
  "service_needed",
  "address",
  "urgency",
  "preferred_time",
] satisfies RequestCaptureField[];

export const requestCaptureFieldOptions = [
  { id: "caller_name", label: "Caller name", description: "Who is calling" },
  { id: "phone", label: "Callback phone", description: "Best number to reach them" },
  { id: "email", label: "Email address", description: "Useful when a written follow-up is needed" },
  { id: "reason", label: "Reason for calling", description: "What they need help with" },
  { id: "service_needed", label: "Service needed", description: "Which service or job type they mention" },
  { id: "address", label: "Service address", description: "Where the work or visit would happen" },
  { id: "urgency", label: "Urgency", description: "How quickly they need a response" },
  { id: "preferred_time", label: "Preferred time", description: "When they would like a callback or appointment" },
] satisfies Array<{
  id: RequestCaptureField;
  label: string;
  description: string;
}>;

export function labelRequestField(field: RequestCaptureField | string) {
  return requestCaptureFieldOptions.find((option) => option.id === field)?.label ?? field.replaceAll("_", " ");
}

export function isRequestCaptureField(value: string): value is RequestCaptureField {
  return requestCaptureFieldIds.includes(value as RequestCaptureField);
}

export const ownerAlertTemplateOptions = [
  {
    id: "standard",
    label: "Standard summary",
    description: "Good for most appointment requests and callbacks.",
    template: "New call from {{caller_name}} about {{reason}}. Preferred time: {{preferred_time}}.",
  },
  {
    id: "detailed",
    label: "Detailed request",
    description: "Includes the service and best callback number.",
    template: "New request from {{caller_name}} about {{service_needed}}. Reason: {{reason}}. Callback: {{phone}}.",
  },
  {
    id: "urgent",
    label: "Urgent summary",
    description: "Highlights urgency and the callback number first.",
    template: "Urgent call from {{caller_name}}. Callback: {{phone}}. Issue: {{reason}}.",
  },
] as const;

export const ownerAlertSampleValues: Record<RequestCaptureField, string> = {
  caller_name: "Jamie Parker",
  phone: "204-555-0184",
  email: "jamie@example.com",
  reason: "an appointment request",
  service_needed: "cleaning service",
  address: "123 Main Street",
  urgency: "normal",
  preferred_time: "Thursday afternoon",
};

export function renderOwnerAlertTemplatePreview(
  template: string,
  values: Partial<Record<RequestCaptureField | string, string>> = ownerAlertSampleValues,
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return values[key] || labelRequestField(key);
  });
}

export function ownerAlertTemplateFields(template: string) {
  const fields = new Set<RequestCaptureField | string>();
  for (const match of template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    fields.add(match[1]);
  }
  return [...fields];
}

export function selectedOwnerAlertTemplateId(template: string) {
  return ownerAlertTemplateOptions.find((option) => option.template === template)?.id ?? "custom";
}

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
