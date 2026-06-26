import { NextResponse } from "next/server";
import { AnsweringPlanEnvelopeSchema } from "@/domain/answering-plan/schema";
import { runPlanAssistant } from "@/integrations/gemini/plan-assistant";
import { runFoundationMockPlanAssistant } from "@/domain/answering-plan/mock-assistant";

import { AnsweringSetupSchema, runSmallBusinessSetupMockAssistant } from "@/domain/small-business-answering";
import { runSetupAssistant } from "@/integrations/gemini/setup-assistant";
import { isGeminiConfigured } from "@/integrations/gemini/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const instruction = String(body.instruction ?? "").trim();
    if (!instruction) throw new Error("Instruction is required.");
    if (body.setup) {
      const setup = AnsweringSetupSchema.parse(body.setup);
      if (body.useMock === true || body.useFoundationMock === true || !isGeminiConfigured()) {
        const result = runSmallBusinessSetupMockAssistant(setup, instruction);
        return NextResponse.json({ result, provider: "small-business-answering-mock" });
      }
      const result = await runSetupAssistant({ setup, instruction });
      return NextResponse.json({ result, provider: "gemini-small-business-answering" });
    }

    const plan = AnsweringPlanEnvelopeSchema.parse(body.plan);
    if (body.useFoundationMock === true) {
      const result = runFoundationMockPlanAssistant(plan, instruction);
      return NextResponse.json({ result, provider: "foundation-mock" });
    }
    const result = await runPlanAssistant({ plan, instruction });
    return NextResponse.json({ result, provider: "gemini" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plan update failed." },
      { status: 400 },
    );
  }
}
