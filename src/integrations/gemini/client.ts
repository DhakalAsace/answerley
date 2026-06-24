import { GoogleGenAI } from "@google/genai";

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

export const geminiModels = {
  planBuilder:
    process.env.GEMINI_PLAN_BUILDER_MODEL ??
    process.env.GEMINI_PLAN_MODEL ??
    "gemini-3.5-flash",
  planAssistant:
    process.env.GEMINI_PLAN_ASSISTANT_MODEL ?? "gemini-3.5-flash",
  runtimeCompiler:
    process.env.GEMINI_RUNTIME_COMPILER_MODEL ?? "gemini-3.5-flash",
  utility:
    process.env.GEMINI_UTILITY_MODEL ?? "gemini-3.1-flash-lite",
  live:
    process.env.GEMINI_LIVE_MODEL ??
    process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL ??
    "configure-live-model",
} as const;
