import type { LiveRuntimePack } from "@/domain/answering-plan/runtime/schema";

export type VoiceSessionMode = "test" | "live";

export interface VoiceSessionDescriptor {
  sessionId: string;
  businessId: string;
  callId: string;
  planVersionId: string;
  planRevision: number;
  mode: VoiceSessionMode;
  runtime: LiveRuntimePack;
}

export type VoiceGatewayEvent =
  | { type: "connected"; providerSessionId: string }
  | { type: "transcript_turn"; speaker: "caller" | "answerley"; text: string; interrupted?: boolean }
  | { type: "tool_call"; name: string; callId: string; arguments: unknown }
  | { type: "tool_result"; name: string; callId: string; result: unknown }
  | { type: "audio_state"; state: "listening" | "speaking" | "idle" }
  | { type: "ended"; reason: string }
  | { type: "error"; message: string; recoverable: boolean };

export interface VoiceGateway {
  readonly id: string;
  createBrowserSession(descriptor: VoiceSessionDescriptor): Promise<{ ephemeralToken: string; expiresAt: string }>;
  createTelephoneSession(descriptor: VoiceSessionDescriptor, transportContext: unknown): Promise<{ providerSessionId: string }>;
  refreshRuntime(sessionId: string, runtime: LiveRuntimePack): Promise<void>;
  submitToolResult(sessionId: string, toolCallId: string, result: unknown): Promise<void>;
  endSession(sessionId: string, reason: string): Promise<void>;
}
