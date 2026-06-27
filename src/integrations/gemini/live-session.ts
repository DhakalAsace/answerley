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
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
      ...(functionDeclarations.length
        ? { tools: [{ functionDeclarations }] }
        : {}),
    },
  };
}

export function buildGeminiLiveWebSocketSetup(runtime: LiveRuntimePack) {
  const liveConfig = buildGeminiLiveConnectConfig(runtime).config;
  const { responseModalities, ...setupConfig } = liveConfig;
  return {
    setup: {
      model: `models/${runtime.model}`,
      generationConfig: {
        responseModalities,
      },
      ...setupConfig,
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
    parameters: toLiveApiSchema(tool.parameters),
  };
}

function toLiveApiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toLiveApiSchema);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (key === "additionalProperties") continue;
    if (key === "type" && Array.isArray(item)) {
      const nonNullType = item.find((entry) => entry !== "null");
      if (nonNullType) next.type = nonNullType;
      if (item.includes("null")) next.nullable = true;
      continue;
    }
    next[key] = toLiveApiSchema(item);
  }

  if (next.properties && typeof next.properties === "object") {
    next.properties = Object.fromEntries(
      Object.entries(next.properties as Record<string, unknown>).map(([key, item]) => [key, toLiveApiSchema(item)]),
    );
  }
  return next;
}
