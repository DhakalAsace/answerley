import type { AnsweringSetup } from "@/domain/small-business-answering";

export const SBA_SETUP_KEY = "small-business-answering-setup";
export const SBA_TEST_CALL_KEY = "small-business-answering-test-call";
export const SBA_SESSION_TOKEN_KEY = "small-business-answering-session-token";

export type StoredTestCall = {
  id: string;
  dbId?: string;
  businessId?: string;
  setupId?: string;
  startedAt: string;
  summary: string;
  transcript: Array<{ id: string; speaker: "caller" | "setup"; text: string }>;
  outcomes: Array<{ id: string; type: string; title: string; detail: string; status: string }>;
  setupRevision: number;
  audioChunkCount?: number;
};

export type StoredRequestStatus = "new" | "contacted" | "booked" | "completed" | "archived";

export type StoredRequest = {
  id: string;
  callId?: string | null;
  requestType: "appointment" | "message" | "callback" | "urgent" | "service" | "other";
  status: StoredRequestStatus;
  serviceId?: string | null;
  callerName?: string | null;
  callerPhone?: string | null;
  callerEmail?: string | null;
  preferredTime?: string | null;
  summary?: string | null;
  urgency: "normal" | "important" | "urgent";
  testMode: boolean;
  createdAt: string;
};

export type StoredMessage = {
  id: string;
  callId?: string | null;
  requestId?: string | null;
  category: "owner_alert" | "caller_confirmation" | "internal" | "caller_message";
  channel: "sms" | "email" | "in_app";
  status: string;
  recipientLabel?: string | null;
  recipientAddress?: string | null;
  body: string;
  createdAt: string;
  sentAt?: string | null;
};

export type StoredWorkspace = {
  setup?: AnsweringSetup;
  testCall?: StoredTestCall | null;
  requests?: StoredRequest[];
  messages?: StoredMessage[];
  sessionToken?: string | null;
  businessId?: string;
  setupId?: string;
};

function readJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem(key);
  if (!stored) return undefined;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadLocalSbaWorkspace(): StoredWorkspace {
  if (typeof window === "undefined") return {};
  return {
    setup: readJson<AnsweringSetup>(SBA_SETUP_KEY),
    testCall: readJson<StoredTestCall>(SBA_TEST_CALL_KEY),
    sessionToken: window.localStorage.getItem(SBA_SESSION_TOKEN_KEY),
  };
}

export async function loadSbaWorkspace(): Promise<StoredWorkspace> {
  const local = loadLocalSbaWorkspace();
  if (!local.sessionToken) return local;

  try {
    const response = await fetch(`/api/sba/workspace?sessionToken=${encodeURIComponent(local.sessionToken)}`, {
      cache: "no-store",
    });
    if (!response.ok) return local;
    const remote = (await response.json()) as StoredWorkspace;
    if (remote.setup) writeJson(SBA_SETUP_KEY, remote.setup);
    if (remote.testCall) writeJson(SBA_TEST_CALL_KEY, remote.testCall);
    return {
      ...local,
      ...remote,
      sessionToken: local.sessionToken,
    };
  } catch {
    return local;
  }
}

export async function saveSbaWorkspace({
  setup,
  testCall,
}: {
  setup: AnsweringSetup;
  testCall?: StoredTestCall | null;
}): Promise<StoredWorkspace> {
  writeJson(SBA_SETUP_KEY, setup);
  if (testCall) writeJson(SBA_TEST_CALL_KEY, testCall);

  const existingToken = typeof window === "undefined" ? null : window.localStorage.getItem(SBA_SESSION_TOKEN_KEY);
  try {
    const response = await fetch("/api/sba/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: existingToken,
        setup,
        testCall,
      }),
    });
    if (!response.ok) return { setup, testCall, sessionToken: existingToken };
    const body = (await response.json()) as StoredWorkspace;
    if (body.sessionToken && typeof window !== "undefined") {
      window.localStorage.setItem(SBA_SESSION_TOKEN_KEY, body.sessionToken);
    }
    if (body.setup) writeJson(SBA_SETUP_KEY, body.setup);
    if (body.testCall) writeJson(SBA_TEST_CALL_KEY, body.testCall);
    return body;
  } catch {
    return { setup, testCall, sessionToken: existingToken };
  }
}
