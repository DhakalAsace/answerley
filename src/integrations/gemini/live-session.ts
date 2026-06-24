import type {
  LiveRuntimePack,
  LiveToolDefinition,
} from "@/domain/answering-plan/runtime/schema";

const audioResponseModalities = ["AUDIO"] as const;

export function buildGeminiLiveConnectConfig(runtime: LiveRuntimePack) {
  const functionDeclarations = runtime.tools.map(toGeminiFunctionDeclaration);
  return {
    model: runtime.model,
    config: {
      responseModalities: audioResponseModalities,
      systemInstruction: {
        parts: [{ text: runtime.systemInstruction }],
      },
      contextWindowCompression: { slidingWindow: {} },
      ...(functionDeclarations.length
        ? { tools: [{ functionDeclarations }] }
        : {}),
    },
  };
}

export function buildGeminiLiveWebSocketSetup(runtime: LiveRuntimePack) {
  const liveConfig = buildGeminiLiveConnectConfig(runtime).config;
  return {
    setup: {
      model: `models/${runtime.model}`,
      ...liveConfig,
    },
  };
}

function toGeminiFunctionDeclaration(tool: LiveToolDefinition) {
  return {
    name: tool.name,
    description: [
      tool.description,
      `Invoke when: ${tool.invocationCondition}`,
      `Success means: ${tool.successMeaning}`,
      `On failure: ${tool.failureBehavior}`,
    ].join("\n"),
    parameters: tool.parameters,
  };
}
