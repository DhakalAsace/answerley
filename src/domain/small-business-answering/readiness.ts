import type { AnsweringSetup } from "./schema";

export type SetupGate = AnsweringSetup["activationGates"][number];
export type SetupGateStatus = SetupGate["status"];

const TEST_REQUIRED_GATE_IDS = new Set([
  "business_details",
  "services_answers",
  "hours_after_hours",
  "greeting_voice",
]);

export function calculateAnsweringSetupReadiness(setup: AnsweringSetup) {
  const gates = setup.activationGates;
  const counts = gates.reduce(
    (accumulator, gate) => {
      accumulator[gate.status] += 1;
      return accumulator;
    },
    { complete: 0, needs_review: 0, blocked: 0 },
  );
  const nextGate = gates.find((gate) => gate.status !== "complete") ?? null;
  const testBlockingGate = gates.find((gate) => TEST_REQUIRED_GATE_IDS.has(gate.id) && gate.status === "blocked") ?? null;
  const testReady = gates
    .filter((gate) => TEST_REQUIRED_GATE_IDS.has(gate.id))
    .every((gate) => gate.status !== "blocked");
  const liveReady = gates.every((gate) => gate.status === "complete");
  const allReviewItems = gates.filter((gate) => gate.status !== "complete");

  return {
    mode: setup.status.mode,
    gates,
    counts,
    nextGate,
    testReady,
    liveReady,
    testBlockingGate,
    allReviewItems,
    statusLabel: liveReady
      ? "Ready for final approval"
      : testReady
        ? "Testing ready"
        : "Draft - needs review",
  };
}
