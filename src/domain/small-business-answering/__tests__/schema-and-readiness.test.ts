import { describe, expect, it } from "vitest";
import {
  AnsweringSetupSchema,
  SBA_SCHEMA_VERSION,
  calculateAnsweringSetupReadiness,
  demoAnsweringSetup,
} from "..";

function setup() {
  return structuredClone(demoAnsweringSetup);
}

describe("Small Business Answering setup", () => {
  it("validates the focused setup fixture", () => {
    const parsed = AnsweringSetupSchema.parse(setup());
    expect(parsed.schemaVersion).toBe(SBA_SCHEMA_VERSION);
    expect(parsed.brand).toBe("Small Business Answering");
  });

  it("keeps the demo draft out of live mode until activation gates are complete", () => {
    const report = calculateAnsweringSetupReadiness(setup());
    expect(report.liveReady).toBe(false);
    expect(report.counts.blocked).toBeGreaterThan(0);
    expect(report.nextGate?.id).toBe("services_answers");
  });

  it("allows browser testing before phone routing and billing are complete", () => {
    const candidate = setup();
    candidate.activationGates = candidate.activationGates.map((gate) =>
      gate.id === "services_answers" || gate.id === "hours_after_hours"
        ? { ...gate, status: "complete" }
        : gate,
    );
    const report = calculateAnsweringSetupReadiness(candidate);
    expect(report.testReady).toBe(true);
    expect(report.liveReady).toBe(false);
  });

  it("becomes live-ready when every activation gate is complete", () => {
    const candidate = setup();
    candidate.activationGates = candidate.activationGates.map((gate) => ({ ...gate, status: "complete" }));
    expect(calculateAnsweringSetupReadiness(candidate).liveReady).toBe(true);
  });
});
