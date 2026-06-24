import { describe, expect, it } from "vitest";
import { genericAnsweringPlanFixture } from "../fixtures";
import { AnsweringPlanEnvelopeSchema } from "../schema";
import { calculatePlanReadiness } from "../readiness";

function plan() {
  return structuredClone(genericAnsweringPlanFixture);
}

describe("canonical Answering Plan", () => {
  it("validates the full generic fixture", () => {
    expect(() => AnsweringPlanEnvelopeSchema.parse(plan())).not.toThrow();
  });

  it("treats enabled SMS contacts without a phone as live-critical", () => {
    const report = calculatePlanReadiness(plan());
    expect(report.testReady).toBe(true);
    expect(report.liveReady).toBe(false);
    expect(report.issues.some((issue) => issue.id.startsWith("notification-phone-"))).toBe(true);
  });

  it("becomes live-ready after the shared contact receives a phone number", () => {
    const candidate = plan();
    candidate.document.routing.contacts[0].phone = "+1 204 555 0199";
    const report = calculatePlanReadiness(candidate);
    expect(report.counts.critical).toBe(0);
    expect(report.liveReady).toBe(true);
  });

  it("does not treat an empty price as missing when pricing mode is do-not-quote", () => {
    const candidate = plan();
    candidate.document.routing.contacts[0].phone = "+1 204 555 0199";
    candidate.document.offerings[0].pricing = {
      ...candidate.document.offerings[0].pricing,
      mode: "do_not_quote",
      startingPrice: null,
      minimumPrice: null,
      maximumPrice: null,
      fixedPrice: null,
    };
    const report = calculatePlanReadiness(candidate);
    expect(report.issues.some((issue) => issue.id.startsWith("pricing-"))).toBe(false);
  });

  it("requires a link only when booking is enabled in send-link mode", () => {
    const candidate = plan();
    candidate.document.booking.enabled = true;
    candidate.document.booking.defaultMethod = "send_link";
    candidate.document.booking.bookingLinkId = null;
    expect(calculatePlanReadiness(candidate).issues.some((issue) => issue.id === "booking-link")).toBe(true);

    candidate.document.booking.enabled = false;
    expect(calculatePlanReadiness(candidate).issues.some((issue) => issue.id === "booking-link")).toBe(false);
  });
});
