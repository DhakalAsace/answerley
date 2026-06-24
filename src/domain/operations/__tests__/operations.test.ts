import { describe, expect, it } from "vitest";
import { CallEventSchema, CallSchema, MessageSchema, RequestSchema } from "../schema";


describe("operational activity records", () => {
  it("connects a test call to an immutable plan version", () => {
    const call = CallSchema.parse({
      id: "call_1",
      organizationId: null,
      businessId: "business_1",
      planVersionId: "version_7",
      planRevision: 7,
      mode: "test",
      status: "completed",
      providerCallId: null,
      callerName: "Test Caller",
      callerPhone: null,
      startedAt: "2026-06-24T18:00:00.000Z",
      endedAt: "2026-06-24T18:02:00.000Z",
      durationSeconds: 120,
      sentiment: "neutral",
      urgency: "normal",
      summary: "A test request was captured.",
      outcome: "request_captured",
      resolved: true,
      ownerNotified: false,
      matchedScenarioIds: ["scenario_request"],
      matchedRoutingRuleIds: [],
      audioUrl: null,
      recordingStatus: "none",
    });
    expect(call.planRevision).toBe(7);
    expect(call.mode).toBe("test");
  });

  it("supports related call events, requests, and prepared messages", () => {
    expect(() => CallEventSchema.parse({
      id: "event_1",
      callId: "call_1",
      sequence: 1,
      type: "request_created",
      label: "Request captured",
      payload: { requestId: "request_1" },
      createdAt: "2026-06-24T18:01:00.000Z",
    })).not.toThrow();

    expect(() => RequestSchema.parse({
      id: "request_1",
      businessId: "business_1",
      callId: "call_1",
      planVersionId: "version_7",
      requestTypeId: "request_consultation",
      offeringId: "offering_consultation",
      status: "requested",
      callerName: "Jamie",
      callerPhone: "204-555-0184",
      callerEmail: null,
      collectedFields: { preferred_time: "Thursday afternoon" },
      preferredDateTime: null,
      summary: "Consultation requested.",
      assignedContactIds: [],
      createdAt: "2026-06-24T18:01:00.000Z",
      updatedAt: "2026-06-24T18:01:00.000Z",
    })).not.toThrow();

    expect(() => MessageSchema.parse({
      id: "message_1",
      businessId: "business_1",
      callId: "call_1",
      requestId: "request_1",
      followUpRuleId: "followup_owner",
      direction: "internal",
      category: "owner_alert",
      channel: "sms",
      mode: "test",
      status: "prepared",
      recipientLabel: "Primary contact",
      recipientAddress: null,
      body: "New consultation request from Jamie.",
      providerMessageId: null,
      errorMessage: null,
      createdAt: "2026-06-24T18:01:00.000Z",
      sentAt: null,
    })).not.toThrow();
  });
});
