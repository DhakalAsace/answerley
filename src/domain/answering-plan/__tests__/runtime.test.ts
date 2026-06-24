import { describe, expect, it } from "vitest";
import { genericAnsweringPlanFixture } from "../fixtures";
import {
  FoundationPreviewRuntimeCompiler,
  validateRuntimeCoverage,
} from "../runtime/compiler";

const compiler = new FoundationPreviewRuntimeCompiler();

describe("Gemini Live runtime contract", () => {
  it("builds all instruction layers and complete coverage", async () => {
    const plan = structuredClone(genericAnsweringPlanFixture);
    const runtime = await compiler.compile({
      plan,
      mode: "test",
      model: "gemini-live-configurable",
      currentTime: "2026-06-24T18:00:00.000Z",
    });
    expect(runtime.layers.identity).toContain("Brightfield Services");
    expect(runtime.layers.groundingRules).toContain("Do not infer missing prices");
    expect(runtime.layers.modeRules).toContain("TEST");
    expect(runtime.systemInstruction).toContain("<tool_policy>");
    expect(validateRuntimeCoverage(plan, runtime).complete).toBe(true);
  });

  it("enables simulated transfer in test mode and real transfer only in live mode", async () => {
    const plan = structuredClone(genericAnsweringPlanFixture);
    plan.document.routing.rules[0].enabled = true;
    const testRuntime = await compiler.compile({ plan, mode: "test", model: "test-model" });
    const liveRuntime = await compiler.compile({ plan, mode: "live", model: "test-model" });
    expect(testRuntime.tools.find((tool) => tool.name === "simulate_transfer")?.enabled).toBe(true);
    expect(testRuntime.tools.some((tool) => tool.name === "transfer_call")).toBe(false);
    expect(liveRuntime.tools.find((tool) => tool.name === "transfer_call")?.enabled).toBe(true);
  });
});
