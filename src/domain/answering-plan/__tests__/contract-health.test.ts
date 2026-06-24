import { describe, expect, it } from "vitest";
import { capabilityContracts, contractHealthSummary } from "../capabilities";
import { fieldRegistry, planSections } from "../field-registry";
import { genericAnsweringPlanFixture } from "../fixtures";
import { generateSuggestedTestPrompts } from "../selectors";


describe("foundation contract health", () => {
  it("keeps every registered field attached to a known section", () => {
    const sections = new Set(planSections.map((section) => section.id));
    for (const field of fieldRegistry) expect(sections.has(field.section)).toBe(true);
  });

  it("declares all foundation capabilities complete", () => {
    const summary = contractHealthSummary();
    expect(summary.healthy).toBe(true);
    expect(summary.complete).toBe(capabilityContracts.length);
  });

  it("derives guided test phrases from the current plan", () => {
    const prompts = generateSuggestedTestPrompts(genericAnsweringPlanFixture);
    expect(prompts.some((prompt) => prompt.category === "offering")).toBe(true);
    expect(prompts.some((prompt) => prompt.category === "request")).toBe(true);
    expect(prompts.some((prompt) => prompt.category === "message")).toBe(true);
    expect(prompts.some((prompt) => prompt.category === "unknown")).toBe(true);
  });
});
