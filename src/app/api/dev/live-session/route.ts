import { NextResponse } from "next/server";
import { FoundationPreviewRuntimeCompiler } from "@/domain/answering-plan/runtime/compiler";
import { AnsweringSetupSchema, setupToAnsweringPlanEnvelope } from "@/domain/small-business-answering";
import { createGeminiLiveBrowserSession } from "@/integrations/gemini/live-token";
import { geminiModels } from "@/integrations/gemini/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const setup = AnsweringSetupSchema.parse(body.setup);
    const mode = body.mode === "live" ? "live" : "test";
    const plan = setupToAnsweringPlanEnvelope(setup);
    const compiler = new FoundationPreviewRuntimeCompiler();
    const runtime = await compiler.compile({
      plan,
      mode,
      model: geminiModels.live,
      currentTime: new Date().toISOString(),
    });
    const session = await createGeminiLiveBrowserSession(runtime);

    return NextResponse.json({
      provider: "gemini-live",
      compiler: compiler.id,
      model: runtime.model,
      runtime: {
        planId: runtime.planId,
        planRevision: runtime.planRevision,
        identity: runtime.layers.identity,
        toolCount: runtime.tools.length,
      },
      webSocketUrl: session.webSocketUrl,
      setupMessage: session.setupMessage,
      expiresAt: session.expiresAt,
      newSessionExpiresAt: session.newSessionExpiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gemini Live session failed." },
      { status: 400 },
    );
  }
}
