import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview";

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export const geminiTextGenerationConfig = {
  thinking_level: "low",
} as const;

export const geminiModels = {
  planBuilder:
    process.env.GEMINI_PLAN_BUILDER_MODEL ??
    process.env.GEMINI_PLAN_MODEL ??
    DEFAULT_GEMINI_TEXT_MODEL,
  planAssistant:
    process.env.GEMINI_PLAN_ASSISTANT_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL,
  runtimeCompiler:
    process.env.GEMINI_RUNTIME_COMPILER_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL,
  utility:
    process.env.GEMINI_UTILITY_MODEL ?? DEFAULT_GEMINI_TEXT_MODEL,
  live:
    process.env.GEMINI_LIVE_MODEL ??
    process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL ??
    DEFAULT_GEMINI_LIVE_MODEL,
} as const;
