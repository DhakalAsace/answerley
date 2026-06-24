import { describe, expect, it } from "vitest";
import { genericAnsweringPlanFixture } from "../fixtures";
import {
  applyPlanChange,
  createManualChange,
  PlanRevisionConflictError,
} from "../patches";

function plan() {
  return structuredClone(genericAnsweringPlanFixture);
}

describe("shared Answering Plan write path", () => {
  it("applies a surgical patch, increments the revision, and records metadata", () => {
    const current = plan();
    const proposal = createManualChange({
      plan: current,
      summary: "Close earlier on Friday",
      operations: [
        {
          op: "replace",
          path: "/hoursAvailability/regularHours/friday/periods/0/closesAt",
          value: "16:00",
        },
      ],
      riskLevel: "medium",
    });
    const result = applyPlanChange(current, proposal, new Date("2026-06-24T18:00:00.000Z"));
    expect(result.plan.revision).toBe(current.revision + 1);
    expect(result.plan.document.hoursAvailability.regularHours.friday.periods[0].closesAt).toBe("16:00");
    expect(result.plan.fieldMetadata[proposal.operations[0].path].sourceType).toBe("user");
    expect(current.document.hoursAvailability.regularHours.friday.periods[0].closesAt).toBe("17:00");
  });

  it("rejects stale proposals", () => {
    const current = plan();
    const proposal = createManualChange({
      plan: current,
      summary: "Change business name",
      operations: [{ op: "replace", path: "/businessProfile/businessName", value: "New Name" }],
    });
    proposal.baseRevision = current.revision - 1;
    expect(() => applyPlanChange(current, proposal)).toThrow(PlanRevisionConflictError);
  });

  it("rejects a patch that would violate the canonical schema", () => {
    const current = plan();
    const proposal = createManualChange({
      plan: current,
      summary: "Invalid pricing mode",
      operations: [{ op: "replace", path: "/offerings/0/pricing/mode", value: "whatever" }],
    });
    expect(() => applyPlanChange(current, proposal)).toThrow();
  });
});
