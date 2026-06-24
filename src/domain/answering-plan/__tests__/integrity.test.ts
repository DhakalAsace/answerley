import { describe, expect, it } from "vitest";
import { genericAnsweringPlanFixture } from "../fixtures";
import { assertPlanIntegrity, validatePlanIntegrity } from "../integrity";
import { applyPlanChange, createManualChange, InvalidPlanPatchError } from "../patches";

function fixture() {
  return structuredClone(genericAnsweringPlanFixture);
}

describe("Answering Plan integrity", () => {
  it("accepts the generic foundation fixture", () => {
    expect(validatePlanIntegrity(fixture().document)).toEqual([]);
    expect(() => assertPlanIntegrity(fixture().document)).not.toThrow();
  });

  it("detects dangling cross-section references", () => {
    const plan = fixture();
    plan.document.offerings[0].requestTypeId = "request_missing";
    const issues = validatePlanIntegrity(plan.document);
    expect(issues.some((issue) => issue.code === "missing-reference" && issue.path.includes("requestTypeId"))).toBe(true);
  });

  it("rejects whole-document replacement patches", () => {
    const plan = fixture();
    const proposal = createManualChange({
      plan,
      summary: "Replace everything",
      operations: [{ op: "replace", path: "/", value: plan.document }],
    });
    expect(() => applyPlanChange(plan, proposal)).toThrow(InvalidPlanPatchError);
  });

  it("rejects a patch that leaves a dangling reference", () => {
    const plan = fixture();
    const proposal = createManualChange({
      plan,
      summary: "Break an offering reference",
      operations: [{ op: "replace", path: "/offerings/0/requestTypeId", value: "request_missing" }],
    });
    expect(() => applyPlanChange(plan, proposal)).toThrow(/integrity failed/i);
  });
});
