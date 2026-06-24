import { NextResponse } from "next/server";
import { AnsweringPlanEnvelopeSchema } from "@/domain/answering-plan/schema";
import { FoundationPreviewRuntimeCompiler } from "@/domain/answering-plan/runtime/compiler";
import { GeminiFlashRuntimeCompiler } from "@/integrations/gemini/runtime-compiler";
import { geminiModels } from "@/integrations/gemini/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = AnsweringPlanEnvelopeSchema.parse(body.plan);
    const mode = body.mode === "live" ? "live" : "test";
    const useGemini = Boolean(body.useGemini && process.env.GEMINI_API_KEY);
    const compiler = useGemini
      ? new GeminiFlashRuntimeCompiler()
      : new FoundationPreviewRuntimeCompiler();
    const runtime = await compiler.compile({
      plan,
      mode,
      model: geminiModels.live,
      currentTime: new Date().toISOString(),
    });
    return NextResponse.json({ runtime, compiler: compiler.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Runtime compilation failed." },
      { status: 400 },
    );
  }
}
