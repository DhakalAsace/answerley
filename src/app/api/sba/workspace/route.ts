import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AnsweringSetupSchema, type AnsweringSetup } from "@/domain/small-business-answering";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/integrations/supabase/admin";

const TranscriptTurnSchema = z.object({
  id: z.string().min(1),
  speaker: z.enum(["caller", "setup"]),
  text: z.string().min(1),
});

const OutcomeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  status: z.string().min(1),
});

const TestCallSchema = z.object({
  id: z.string().min(1),
  dbId: z.string().uuid().optional(),
  businessId: z.string().min(1).optional(),
  setupId: z.string().min(1).optional(),
  startedAt: z.string().datetime(),
  summary: z.string().min(1),
  transcript: z.array(TranscriptTurnSchema).default([]),
  outcomes: z.array(OutcomeSchema).default([]),
  setupRevision: z.number().int().positive(),
  audioChunkCount: z.number().int().nonnegative().optional(),
});

type TestCall = z.infer<typeof TestCallSchema>;

const WorkspacePostSchema = z.object({
  sessionToken: z.string().min(16).optional().nullable(),
  setup: AnsweringSetupSchema,
  testCall: TestCallSchema.optional().nullable(),
});

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type OutcomeType = "details" | "request" | "message" | "followup" | "alert" | "transfer" | "urgent";
type RequestType = "appointment" | "message" | "callback" | "urgent" | "service";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return `${randomUUID()}.${randomBytes(24).toString("base64url")}`;
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function setupColumns(setup: AnsweringSetup) {
  return {
    schema_version: setup.schemaVersion,
    draft_revision: setup.status.draftRevision,
    live_revision: setup.status.liveRevision,
    status_mode: setup.status.mode,
    is_live: setup.status.isLive,
    is_paused: setup.status.isPaused,
    needs_review: setup.status.needsReview,
    last_published_at: setup.status.lastPublishedAt,
    last_tested_at: setup.status.lastTestedAt,
    draft_document: setup,
  };
}

function businessColumns(setup: AnsweringSetup) {
  return {
    name: setup.business.name,
    submitted_website: setup.business.websiteUrl,
    public_phone: setup.business.publicPhone,
    public_email: setup.business.publicEmail,
    timezone: setup.business.timezone,
    status: setup.status.mode,
    metadata: {
      canonicalBusinessId: setup.businessId,
      canonicalSetupId: setup.setupId,
      serviceArea: setup.business.serviceArea,
      primaryLanguage: setup.business.primaryLanguage,
      additionalLanguages: setup.business.additionalLanguages,
    },
  };
}

async function findGuestSession(supabase: SupabaseClient, sessionToken: string | null | undefined) {
  if (!sessionToken) return null;
  const { data, error } = await supabase
    .from("sba_guest_sessions")
    .select("id,business_id,setup_id")
    .eq("public_token_hash", hashToken(sessionToken))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertBusiness(supabase: SupabaseClient, setup: AnsweringSetup, businessId?: string | null) {
  const columns = businessColumns(setup);
  if (businessId) {
    const { data, error } = await supabase
      .from("sba_businesses")
      .update(columns)
      .eq("id", businessId)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase
    .from("sba_businesses")
    .insert(columns)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function upsertSetup(
  supabase: SupabaseClient,
  setup: AnsweringSetup,
  businessId: string,
  setupId?: string | null,
) {
  const columns = { business_id: businessId, ...setupColumns(setup) };
  if (setupId) {
    const { data, error } = await supabase
      .from("sba_answering_setups")
      .update(columns)
      .eq("id", setupId)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase
    .from("sba_answering_setups")
    .insert(columns)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function ensureSetupVersion(
  supabase: SupabaseClient,
  setup: AnsweringSetup,
  setupId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("sba_answering_setup_versions")
    .select("id")
    .eq("setup_id", setupId)
    .eq("revision", setup.status.draftRevision)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("sba_answering_setup_versions")
    .insert({
      setup_id: setupId,
      revision: setup.status.draftRevision,
      version_kind: setup.status.isLive ? "published" : "draft_snapshot",
      schema_version: setup.schemaVersion,
      document: setup,
      source: setup.sources.some((source) => source.type === "website") ? "website_builder" : "manual_ui",
      change_summary: "Saved Small Business Answering setup",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function upsertGuestSession(
  supabase: SupabaseClient,
  sessionToken: string,
  setup: AnsweringSetup,
  businessId: string,
  setupId: string,
  existingSessionId?: string | null,
  testCall?: TestCall | null,
) {
  const state: "tested" | "test_ready" = testCall ? "tested" : "test_ready";
  const columns = {
    public_token_hash: hashToken(sessionToken),
    state,
    submitted_business: setup.business.name,
    submitted_website: setup.business.websiteUrl,
    business_id: businessId,
    setup_id: setupId,
    setup_revision: setup.status.draftRevision,
    setup_document: setup,
    source_documents: setup.sources,
    test_activity: testCall
      ? {
          lastTestCallId: testCall.id,
          lastTestedAt: testCall.startedAt,
          outcomes: testCall.outcomes.length,
          transcriptTurns: testCall.transcript.length,
        }
      : {},
    last_seen_at: new Date().toISOString(),
  };

  if (existingSessionId) {
    const { data, error } = await supabase
      .from("sba_guest_sessions")
      .update(columns)
      .eq("id", existingSessionId)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase
    .from("sba_guest_sessions")
    .insert(columns)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function persistSources(supabase: SupabaseClient, setup: AnsweringSetup, businessId: string, setupId: string) {
  const rows = setup.sources
    .filter((source): source is typeof source & { url: string } => Boolean(source.url))
    .map((source) => {
      const extractedText = source.excerpt ?? source.label;
      return {
        business_id: businessId,
        setup_id: setupId,
        canonical_source_id: source.id,
        provider: source.type,
        url: source.url,
        page_title: source.label,
        content_hash: hashText(`${source.url}:${extractedText}`),
        extracted_text: extractedText,
        fetch_metadata: {
          capturedAt: source.capturedAt,
          sourceType: source.type,
        },
      };
    });
  if (!rows.length) return;
  const { error } = await supabase
    .from("sba_source_documents")
    .upsert(rows, { onConflict: "business_id,url,content_hash", ignoreDuplicates: true });
  if (error) throw error;
}

function normalizeOutcomeType(value: string): OutcomeType {
  if (["details", "request", "message", "followup", "alert", "transfer", "urgent"].includes(value)) {
    return value as OutcomeType;
  }
  return "details";
}

function inferRequestType(outcome: TestCall["outcomes"][number]): RequestType {
  const text = `${outcome.title} ${outcome.detail}`.toLowerCase();
  if (outcome.type === "urgent" || text.includes("urgent")) return "urgent";
  if (text.includes("appointment") || text.includes("preferred time")) return "appointment";
  if (outcome.type === "message") return "message";
  if (text.includes("callback") || text.includes("call back")) return "callback";
  return "service";
}

async function persistTestCall(
  supabase: SupabaseClient,
  setup: AnsweringSetup,
  testCall: TestCall,
  businessId: string,
  setupId: string,
  setupVersionId: string,
) {
  const startedAt = new Date(testCall.startedAt);
  const endedAt = new Date(Math.max(startedAt.getTime() + 1000, Date.now()));
  const { data: call, error: callError } = await supabase
    .from("sba_calls")
    .insert({
      business_id: businessId,
      setup_id: setupId,
      setup_version_id: setupVersionId,
      setup_revision: testCall.setupRevision,
      mode: "test",
      status: "completed",
      provider: testCall.audioChunkCount ? "browser-gemini-live" : "browser-test",
      provider_call_id: testCall.id,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)),
      summary: testCall.summary,
      outcome: testCall.outcomes[0]?.title ?? "Browser test completed",
      audio_chunk_count: testCall.audioChunkCount ?? 0,
      metadata: {
        localCallId: testCall.id,
        canonicalSetupId: setup.setupId,
      },
    })
    .select("id")
    .single();
  if (callError) throw callError;
  const callId = call.id as string;

  if (testCall.transcript.length) {
    const { error } = await supabase.from("sba_call_transcript_turns").insert(
      testCall.transcript.map((turn, index) => ({
        call_id: callId,
        sequence: index,
        speaker: turn.speaker,
        text: turn.text,
        source: turn.id.includes("setup_live") ? "gemini_live" : "simulated",
      })),
    );
    if (error) throw error;
  }

  if (testCall.outcomes.length) {
    const { error } = await supabase.from("sba_call_outcomes").insert(
      testCall.outcomes.map((outcome) => ({
        call_id: callId,
        outcome_type: normalizeOutcomeType(outcome.type),
        title: outcome.title,
        detail: outcome.detail,
        status: outcome.status,
        payload: { localOutcomeId: outcome.id },
      })),
    );
    if (error) throw error;
  }

  const requestOutcomes = testCall.outcomes.filter((outcome) => outcome.type === "request" || outcome.type === "urgent");
  if (requestOutcomes.length) {
    const { error } = await supabase.from("sba_requests").insert(
      requestOutcomes.map((outcome) => ({
        business_id: businessId,
        setup_id: setupId,
        call_id: callId,
        request_type: inferRequestType(outcome),
        status: "new",
        collected_fields: { detail: outcome.detail },
        preferred_time: /thursday|friday|monday|tuesday|wednesday|afternoon|morning/i.test(outcome.detail) ? outcome.detail : null,
        summary: outcome.title,
        urgency: outcome.type === "urgent" ? "urgent" : "normal",
        test_mode: true,
      })),
    );
    if (error) throw error;
  }

  const messageOutcomes = testCall.outcomes.filter((outcome) => ["alert", "message", "followup"].includes(outcome.type));
  if (messageOutcomes.length) {
    const { error } = await supabase.from("sba_messages").insert(
      messageOutcomes.map((outcome) => ({
        business_id: businessId,
        setup_id: setupId,
        call_id: callId,
        category: outcome.type === "alert" ? "owner_alert" : outcome.type === "followup" ? "caller_confirmation" : "caller_message",
        channel: "in_app",
        mode: "test",
        status: outcome.status.toLowerCase().includes("simulated") ? "simulated" : "prepared",
        recipient_label: outcome.type === "alert" ? "Business owner" : "Caller",
        body: `${outcome.title}: ${outcome.detail}`,
      })),
    );
    if (error) throw error;
  }

  return callId;
}

export async function GET(request: Request) {
  if (!hasSupabaseAdminEnv()) return jsonError("Supabase is not configured.", 503);
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get("sessionToken");
  if (!sessionToken) return jsonError("Session token is required.", 400);

  try {
    const supabase = createSupabaseAdminClient();
    const session = await findGuestSession(supabase, sessionToken);
    if (!session?.setup_id) return jsonError("Workspace was not found.", 404);

    const { data: setupRow, error: setupError } = await supabase
      .from("sba_answering_setups")
      .select("id,business_id,draft_document,draft_revision")
      .eq("id", session.setup_id)
      .single();
    if (setupError) throw setupError;

    const { data: callRows, error: callsError } = await supabase
      .from("sba_calls")
      .select("id,started_at,summary,setup_revision,audio_chunk_count")
      .eq("setup_id", session.setup_id)
      .eq("mode", "test")
      .order("started_at", { ascending: false })
      .limit(1);
    if (callsError) throw callsError;

    let testCall = null;
    const latestCall = callRows?.[0];
    if (latestCall) {
      const [{ data: transcript, error: transcriptError }, { data: outcomes, error: outcomesError }] = await Promise.all([
        supabase
          .from("sba_call_transcript_turns")
          .select("id,speaker,text")
          .eq("call_id", latestCall.id)
          .order("sequence", { ascending: true }),
        supabase
          .from("sba_call_outcomes")
          .select("id,outcome_type,title,detail,status")
          .eq("call_id", latestCall.id)
          .order("created_at", { ascending: true }),
      ]);
      if (transcriptError) throw transcriptError;
      if (outcomesError) throw outcomesError;
      testCall = {
        id: String(latestCall.id),
        dbId: latestCall.id,
        businessId: setupRow.business_id,
        setupId: setupRow.id,
        startedAt: latestCall.started_at,
        summary: latestCall.summary,
        setupRevision: latestCall.setup_revision,
        audioChunkCount: latestCall.audio_chunk_count,
        transcript: (transcript ?? []).map((turn) => ({
          id: turn.id,
          speaker: turn.speaker,
          text: turn.text,
        })),
        outcomes: (outcomes ?? []).map((outcome) => ({
          id: outcome.id,
          type: outcome.outcome_type,
          title: outcome.title,
          detail: outcome.detail,
          status: outcome.status,
        })),
      };
    }

    const [{ data: requestRows, error: requestsError }, { data: messageRows, error: messagesError }] = await Promise.all([
      supabase
        .from("sba_requests")
        .select("id,call_id,request_type,status,service_id,caller_name,caller_phone,caller_email,preferred_time,summary,urgency,test_mode,created_at")
        .eq("setup_id", session.setup_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("sba_messages")
        .select("id,call_id,request_id,category,channel,status,recipient_label,recipient_address,body,created_at,sent_at")
        .eq("setup_id", session.setup_id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (requestsError) throw requestsError;
    if (messagesError) throw messagesError;

    return NextResponse.json({
      setup: setupRow.draft_document,
      testCall,
      requests: (requestRows ?? []).map((row) => ({
        id: row.id,
        callId: row.call_id,
        requestType: row.request_type,
        status: row.status,
        serviceId: row.service_id,
        callerName: row.caller_name,
        callerPhone: row.caller_phone,
        callerEmail: row.caller_email,
        preferredTime: row.preferred_time,
        summary: row.summary,
        urgency: row.urgency,
        testMode: row.test_mode,
        createdAt: row.created_at,
      })),
      messages: (messageRows ?? []).map((row) => ({
        id: row.id,
        callId: row.call_id,
        requestId: row.request_id,
        category: row.category,
        channel: row.channel,
        status: row.status,
        recipientLabel: row.recipient_label,
        recipientAddress: row.recipient_address,
        body: row.body,
        createdAt: row.created_at,
        sentAt: row.sent_at,
      })),
      businessId: setupRow.business_id,
      setupId: setupRow.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Workspace load failed.", 500);
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv()) return jsonError("Supabase is not configured.", 503);

  try {
    const body = WorkspacePostSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const sessionToken = body.sessionToken?.trim() || createSessionToken();
    const existingSession = await findGuestSession(supabase, sessionToken);
    const businessId = await upsertBusiness(supabase, body.setup, existingSession?.business_id);
    const setupId = await upsertSetup(supabase, body.setup, businessId, existingSession?.setup_id);
    const setupVersionId = await ensureSetupVersion(supabase, body.setup, setupId);
    const guestSessionId = await upsertGuestSession(
      supabase,
      sessionToken,
      body.setup,
      businessId,
      setupId,
      existingSession?.id,
      body.testCall,
    );
    await persistSources(supabase, body.setup, businessId, setupId);

    const callId = body.testCall
      ? await persistTestCall(supabase, body.setup, body.testCall, businessId, setupId, setupVersionId)
      : null;

    return NextResponse.json({
      sessionToken,
      guestSessionId,
      businessId,
      setupId,
      setupVersionId,
      callId,
      setup: body.setup,
      testCall: body.testCall && callId ? { ...body.testCall, dbId: callId, businessId, setupId } : body.testCall,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Workspace save failed.", 400);
  }
}
