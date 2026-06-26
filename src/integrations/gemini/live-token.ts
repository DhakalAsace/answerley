import type { LiveRuntimePack } from "@/domain/answering-plan/runtime/schema";
import { createGeminiClient } from "./client";
import {
  buildGeminiLiveConnectConfig,
  buildGeminiLiveWebSocketSetup,
} from "./live-session";

const liveConstrainedWebSocketUrl =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

export async function createGeminiLiveBrowserSession(runtime: LiveRuntimePack) {
  const client = createGeminiClient();
  const liveConfig = buildGeminiLiveConnectConfig(runtime);
  const now = Date.now();
  const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpiresAt = new Date(now + 60 * 1000).toISOString();
  const token = await client.authTokens.create({
    config: {
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: newSessionExpiresAt,
      httpOptions: { apiVersion: "v1alpha" },
      liveConnectConstraints: {
        model: runtime.model,
        config: liveConfig.config as never,
      },
    },
  });

  if (!token.name) {
    throw new Error("Gemini Live did not return an ephemeral token.");
  }

  return {
    webSocketUrl: `${liveConstrainedWebSocketUrl}?access_token=${encodeURIComponent(token.name)}`,
    setupMessage: buildGeminiLiveWebSocketSetup(runtime),
    expiresAt,
    newSessionExpiresAt,
  };
}
