import { NextResponse } from "next/server";
import { AnsweringPlanEnvelopeSchema } from "@/domain/answering-plan/schema";
import { runPlanAssistant } from "@/integrations/gemini/plan-assistant";
import { runFoundationMockPlanAssistant } from "@/domain/answering-plan/mock-assistant";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = AnsweringPlanEnvelopeSchema.parse(body.plan);
    const instruction = String(body.instruction ?? "").trim();
    if (!instruction) throw new Error("Instruction is required.");
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
