"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ContactRound,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Route,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  applySetupChange,
  calculateAnsweringSetupReadiness,
  demoAnsweringSetup,
  generateSetupTestPrompts,
  type AnsweringSetup,
  type SetupChangeProposal,
  type SetupPatchOperation,
  type SuggestedSetupTestPrompt,
} from "@/domain/small-business-answering";
import type { SetupAssistantResult } from "@/integrations/gemini/setup-assistant";
import { cn, formatLabel } from "@/lib/utils";
import { saveSbaWorkspace, type StoredTestCall } from "@/lib/sba-client-storage";

type Phase = "building" | "testing" | "review" | "save";
type TranscriptTurn = { id: string; speaker: "caller" | "setup"; text: string };
type ImportState = "idle" | "reading" | "ready" | "fallback";

type LiveState = "idle" | "starting" | "connected" | "ready" | "closed" | "error";
type LiveSessionPayload = {
  provider: "gemini-live";
  webSocketUrl: string;
  setupMessage: Record<string, unknown>;
  runtime: {
    planId: string;
    planRevision: number;
    identity: string;
    toolCount: number;
  };
  expiresAt: string;
  newSessionExpiresAt: string;
};

type GeminiLiveMessage = {
  setupComplete?: unknown;
  serverContent?: {
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> };
    generationComplete?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: { functionCalls?: Array<{ id?: string; name?: string; args?: unknown }> };
};

let localIdCounter = 0;
function nextLocalId(prefix: string) {
  localIdCounter += 1;
  return `${prefix}_${localIdCounter}`;
}

type OutcomeCard = {
  id: string;
  type: "details" | "request" | "message" | "followup" | "alert" | "transfer" | "urgent";
  title: string;
  detail: string;
  status: string;
};

const buildSteps = [
  "Reading website information",
  "Finding services and approved answers",
  "Checking hours and after-hours wording",
  "Finding booking and contact links",
  "Preparing call handling and safety",
  "Preparing the call test",
];

function deriveBusinessName(input: string) {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const base = url.hostname.replace(/^www\./, "").split(".")[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Your Business";
  } catch {
    return input.trim() || "Your Business";
  }
}

function normalizeWebsiteInput(input: string) {
  if (!input.includes(".")) return null;
  return input.startsWith("http") ? input : `https://${input}`;
}

function createSetup(input: string): AnsweringSetup {
  const setup = structuredClone(demoAnsweringSetup);
  const businessName = deriveBusinessName(input);
  setup.setupId = `setup_${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "demo"}`;
  setup.businessId = `business_${setup.setupId.replace(/^setup_/, "")}`;
  setup.status.draftRevision = 1;
  setup.status.liveRevision = 0;
  setup.status.isLive = false;
  setup.status.needsReview = true;
  setup.business.name = businessName;
  setup.business.websiteUrl = normalizeWebsiteInput(input);
  setup.callHandling.callerGreeting = `Thanks for calling ${businessName}. How can I help today?`;
  setup.sources = setup.business.websiteUrl
    ? [{
        id: "source_submitted_website",
        type: "website",
        label: "Submitted website",
        url: setup.business.websiteUrl,
        excerpt: null,
        capturedAt: new Date().toISOString(),
      }]
    : [];
  return setup;
}

export function SmallBusinessAnsweringTryClient({
  businessInput = "example.com",
  preview = null,
}: {
  businessInput?: string;
  preview?: string | null;
}) {
  const router = useRouter();
  const previewPhase: Phase =
    preview === "testing" || preview === "testing-populated"
      ? "testing"
      : preview === "review"
        ? "review"
        : preview === "save"
          ? "save"
          : "building";
  const previewPopulated = preview === "testing-populated";
  const buildFinishedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>(previewPhase);
  const [buildStep, setBuildStep] = useState(preview === "building-complete" ? buildSteps.length - 1 : 0);
  const [setup, setSetup] = useState<AnsweringSetup>(() => createSetup(businessInput));
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callEnded, setCallEnded] = useState(previewPopulated);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>(() =>
    previewPopulated
      ? [
          { id: "preview_turn_1", speaker: "setup", text: "Thanks for calling Example. How can I help today?" },
          { id: "preview_turn_2", speaker: "caller", text: "I would like to request an appointment for Thursday afternoon." },
          { id: "preview_turn_3", speaker: "setup", text: "Absolutely. I have your request and contact details ready for the team." },
        ]
      : [],
  );
  const [outcomes, setOutcomes] = useState<OutcomeCard[]>(() =>
    previewPopulated
      ? [
          { id: "preview_outcome_1", type: "details", title: "Contact details collected", detail: "Jamie - 204-555-0184", status: "Captured" },
          { id: "preview_outcome_2", type: "request", title: "Request captured", detail: "Appointment request - Thursday afternoon", status: "Test request" },
          { id: "preview_outcome_3", type: "alert", title: "Owner alert prepared", detail: "New appointment request from Jamie", status: "Ready after activation" },
        ]
      : [],
  );
  const [unknownQuestion, setUnknownQuestion] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [alertPhone, setAlertPhone] = useState("");
  const [email, setEmail] = useState("");
  const liveSocketRef = useRef<WebSocket | null>(null);
  const liveResponseTurnIdRef = useRef<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [liveMessage, setLiveMessage] = useState("Voice preview will connect when the test call starts.");
  const [liveRuntimeIdentity, setLiveRuntimeIdentity] = useState<string | null>(null);
  const [liveAudioChunks, setLiveAudioChunks] = useState(0);

  const finishBuild = useCallback(async () => {
    const websiteUrl = normalizeWebsiteInput(businessInput);
    if (!websiteUrl) {
      setImportState("fallback");
      setImportMessage("No website was supplied, so this setup starts from the safe demo defaults.");
      setPhase("testing");
      return;
    }
    setImportState("reading");
    try {
      const response = await fetch("/api/dev/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, buildSetup: true, buildLegacyPlan: false }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Website import failed.");
      if (body.setup) {
        setSetup(body.setup as AnsweringSetup);
        setImportState("ready");
        setImportMessage(`Built from ${body.scrape?.documents?.length ?? 0} website page${body.scrape?.documents?.length === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      setImportState("fallback");
      setImportMessage(error instanceof Error ? error.message : "Website import failed, so safe defaults are being used.");
    } finally {
      setPhase("testing");
    }
  }, [businessInput]);

  useEffect(() => {
    if (phase !== "building") return;
    const interval = window.setInterval(() => {
      setBuildStep((current) => {
        if (current >= buildSteps.length - 1) {
          window.clearInterval(interval);
          if (!buildFinishedRef.current) {
            buildFinishedRef.current = true;
            window.setTimeout(() => void finishBuild(), 450);
          }
          return current;
        }
        return current + 1;
      });
    }, 540);
    return () => window.clearInterval(interval);
  }, [finishBuild, phase]);

  useEffect(() => () => {
    if (liveSocketRef.current) {
      liveSocketRef.current.close();
      liveSocketRef.current = null;
    }
  }, []);

  const suggestions = useMemo(() => generateSetupTestPrompts(setup), [setup]);
  const readiness = useMemo(() => calculateAnsweringSetupReadiness(setup), [setup]);
  const businessName = setup.business.name || "Your Business";

  function startCall() {
    setCallActive(true);
    setCallEnded(false);
    setTranscript([
      {
        id: nextLocalId("turn"),
        speaker: "setup",
        text: setup.callHandling.callerGreeting || `Thanks for calling ${businessName}. How can I help today?`,
      },
    ]);
    void connectGeminiLive();
  }

  function endCall() {
    setCallActive(false);
    setCallEnded(true);
    if (liveSocketRef.current) {
      liveSocketRef.current.close();
      liveSocketRef.current = null;
    }
    setLiveState((current) => current === "error" ? current : "closed");
    setLiveMessage("Test call voice session closed.");
  }

  async function connectGeminiLive() {
    if (liveSocketRef.current && liveSocketRef.current.readyState === WebSocket.OPEN) return;
    setLiveState("starting");
    setLiveMessage("Starting the voice preview for this test call.");
    setLiveAudioChunks(0);
    try {
      const response = await fetch("/api/dev/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup, mode: "test" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Voice preview failed.");
      const payload = body as LiveSessionPayload;
      setLiveRuntimeIdentity(payload.runtime.identity);
      const socket = new WebSocket(payload.webSocketUrl);
      liveSocketRef.current = socket;

      socket.onopen = () => {
        setLiveState("connected");
        setLiveMessage("Connected to voice preview. Call handling is ready.");
        socket.send(JSON.stringify(payload.setupMessage));
      };
      socket.onmessage = async (event) => {
        const rawMessage =
          typeof event.data === "string"
            ? event.data
            : event.data instanceof Blob
              ? await event.data.text()
              : new TextDecoder().decode(event.data as ArrayBuffer);
        const message = JSON.parse(rawMessage) as GeminiLiveMessage;
        if (message.setupComplete !== undefined) {
          setLiveState("ready");
          setLiveMessage("Voice preview is ready. Typed prompts also go to the test call.");
        }
        const output = message.serverContent?.outputTranscription?.text;
        if (output?.trim()) {
          appendLiveSetupTurn(output);
        }
        if (message.serverContent?.generationComplete || message.serverContent?.turnComplete) {
          liveResponseTurnIdRef.current = null;
        }
        const parts = message.serverContent?.modelTurn?.parts ?? [];
        const audioChunks = parts.filter((part) => Boolean(part.inlineData?.data)).length;
        if (audioChunks) {
          setLiveAudioChunks((current) => current + audioChunks);
        }
        if (message.toolCall?.functionCalls?.length) {
          handleLiveToolCall(socket, message.toolCall.functionCalls);
        }
      };
      socket.onerror = () => {
        setLiveState("error");
        setLiveMessage("The voice preview reported an error. The simulated test still works.");
      };
      socket.onclose = () => {
        if (liveSocketRef.current === socket) liveSocketRef.current = null;
        setLiveState((current) => current === "error" ? current : "closed");
      };
    } catch (error) {
      setLiveState("error");
      setLiveMessage(error instanceof Error ? error.message : "Voice preview failed.");
    }
  }

  function sendLiveText(text: string) {
    const socket = liveSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ realtimeInput: { text } }));
    liveResponseTurnIdRef.current = null;
    return true;
  }

  function handleLiveToolCall(
    socket: WebSocket,
    functionCalls: Array<{ id?: string; name?: string; args?: unknown }>,
  ) {
    const functionResponses = functionCalls.map((call) => {
      const name = call.name ?? "unknown_tool";
      addOutcome({
        type: name.includes("message") ? "message" : name.includes("alert") ? "alert" : name.includes("transfer") ? "transfer" : "details",
        title: `Prepared action: ${formatLabel(name)}`,
        detail: "Handled during this test.",
        status: "Simulated",
      });
      return {
        id: call.id,
        name,
        response: {
          result: {
            ok: true,
            mode: "test",
            note: "Test mode simulated this action. No outside messages were sent.",
          },
        },
      };
    });
    socket.send(JSON.stringify({ toolResponse: { functionResponses } }));
  }

  function appendLiveSetupTurn(fragment: string) {
    const text = fragment.trim();
    if (!text) return;
    const activeTurnId = liveResponseTurnIdRef.current;
    if (activeTurnId) {
      setTranscript((current) =>
        current.map((turn) =>
          turn.id === activeTurnId ? { ...turn, text: joinTranscriptFragments(turn.text, text) } : turn,
        ),
      );
      return;
    }

    const id = nextLocalId("setup_live");
    liveResponseTurnIdRef.current = id;
    setTranscript((current) => [...current, { id, speaker: "setup", text }]);
  }

  function joinTranscriptFragments(current: string, fragment: string) {
    return /^[.,!?;:)]/.test(fragment) ? `${current}${fragment}` : `${current} ${fragment}`;
  }

  function addTurn(speaker: TranscriptTurn["speaker"], text: string) {
    setTranscript((current) => [...current, { id: nextLocalId(speaker), speaker, text }]);
  }

  function addOutcome(card: Omit<OutcomeCard, "id">) {
    setOutcomes((current) => {
      if (current.some((item) => item.type === card.type && item.title === card.title)) return current;
      return [...current, { ...card, id: nextLocalId(card.type) }];
    });
  }

  function runPrompt(prompt: SuggestedSetupTestPrompt) {
    if (!callActive) startCall();
    setUnknownQuestion(null);
    window.setTimeout(() => addTurn("caller", prompt.prompt), 120);
    window.setTimeout(() => sendLiveText(prompt.prompt), 180);
    window.setTimeout(() => {
      if (prompt.category === "approved_answer") {
        const answer = setup.approvedAnswers.find((item) => item.id === prompt.sourceId) ?? setup.approvedAnswers[0];
        addTurn("setup", answer?.answer ?? "I can take a message and have the team follow up.");
        return;
      }
      if (prompt.category === "service") {
        const service = setup.services.find((item) => item.id === prompt.sourceId) ?? setup.services[0];
        addTurn("setup", service?.approvedDescription ?? "I can collect the details and send them to the team.");
        return;
      }
      if (prompt.category === "appointment") {
        addTurn("setup", "Absolutely. May I have your name, callback number, and preferred time?");
        window.setTimeout(() => {
          addTurn("caller", "My name is Jamie. My number is 204-555-0184, and Thursday afternoon works.");
          addOutcome({ type: "details", title: "Contact details collected", detail: "Jamie - 204-555-0184", status: "Captured" });
          addOutcome({ type: "request", title: "Appointment request captured", detail: "Thursday afternoon", status: "Test request" });
          addOutcome({ type: "alert", title: "Owner alert prepared", detail: "New appointment request from Jamie", status: "Ready after activation" });
          window.setTimeout(() => addTurn("setup", setup.requestCapture.callerSummaryWording), 280);
        }, 420);
        return;
      }
      if (prompt.category === "urgent") {
        addTurn("setup", setup.hours.afterHours.urgentWording ?? "I can collect the urgent details and alert the business.");
        window.setTimeout(() => {
          addTurn("caller", "There is water leaking and I need help right away.");
          addOutcome({ type: "urgent", title: "Urgent call detected", detail: "Leak reported - alert prepared", status: "Test urgent route" });
          addOutcome({ type: "alert", title: "On-call alert prepared", detail: "Urgent request from test caller", status: "Ready after activation" });
        }, 420);
        return;
      }
      if (prompt.category === "message") {
        addTurn("setup", "Of course. What message would you like me to pass along, and what is the best number to reach you?");
        window.setTimeout(() => {
          addTurn("caller", "Please ask someone to call me tomorrow at 204-555-0119.");
          addOutcome({ type: "message", title: "Message captured", detail: "Please call tomorrow - 204-555-0119", status: "Ready for the business" });
          addOutcome({ type: "followup", title: "Caller confirmation prepared", detail: "Message received confirmation", status: "Ready after activation" });
          window.setTimeout(() => addTurn("setup", "I have the message and callback number ready for the team."), 260);
        }, 420);
        return;
      }

      const question = "Do you provide a warranty?";
      addTurn("caller", question);
      window.setTimeout(() => {
        const answer = setup.approvedAnswers.find((item) => /warranty/i.test(`${item.question} ${item.answer}`));
        addTurn("setup", answer?.answer ?? "I do not have that confirmed, but I can take a message for the team.");
        if (!answer) {
          setUnknownQuestion(question);
          setUpdateText("We provide a one-year warranty on approved work.");
        }
      }, 260);
    }, 420);
  }

  async function updateSetup() {
    const instruction = updateText.trim();
    if (!instruction) return;
    setUpdating(true);
    setUpdateStatus(null);
    try {
      const fullInstruction = unknownQuestion
        ? `Add an approved answer for the question "${unknownQuestion}": ${instruction}`
        : instruction;
      const response = await fetch("/api/dev/plan-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup, instruction: fullInstruction }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Update failed.");
      const result = body.result as SetupAssistantResult;
      if (result.type === "proposal") {
        const applied = applySetupChange(setup, result.proposal);
        setSetup(applied.setup);
        setUpdateStatus("Updated. The answering setup can use this now.");
        setUnknownQuestion(null);
        setUpdateText("");
      } else if (result.type === "answer") {
        setUpdateStatus(result.answer);
      } else {
        setUpdateStatus(`${result.question}${result.choices.length ? ` ${result.choices.join(" / ")}` : ""}`);
      }
    } catch (error) {
      setUpdateStatus(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setUpdating(false);
    }
  }

  function applyAlertPhone() {
    const phone = alertPhone.trim();
    if (!phone) return;
    const contactIndex = setup.ownerAlerts.contacts.findIndex((contact) => contact.id === "contact_owner") >= 0
      ? setup.ownerAlerts.contacts.findIndex((contact) => contact.id === "contact_owner")
      : 0;
    const operations: SetupPatchOperation[] = [
      { op: "replace", path: `/ownerAlerts/contacts/${contactIndex}/sms`, value: phone },
      { op: "replace", path: "/ownerAlerts/channels", value: Array.from(new Set([...setup.ownerAlerts.channels, "sms"])) },
    ];
    const proposal: SetupChangeProposal = {
      id: nextLocalId("review"),
      baseRevision: setup.status.draftRevision,
      source: "manual_ui",
      summary: "Add owner alert phone",
      userInstruction: null,
      riskLevel: "high",
      requiresConfirmation: true,
      operations,
      affectedPaths: operations.map((operation) => operation.path),
      conflicts: [],
      clarification: null,
    };
    setSetup(applySetupChange(setup, proposal).setup);
  }

  async function saveAndContinue() {
    const testCall = {
      id: "test-call-1",
      startedAt: new Date().toISOString(),
      summary: transcript.length
        ? "Tested business questions, request handling, urgent routing, and message capture."
        : "Test call completed.",
      transcript,
      outcomes,
      setupRevision: setup.status.draftRevision,
      setupId: setup.setupId,
      audioChunkCount: liveAudioChunks,
    } satisfies StoredTestCall;
    await saveSbaWorkspace({ setup, testCall });
    router.push("/dashboard/calls");
  }

  if (phase === "building") {
    return <BuildingScreen business={businessInput} activeStep={buildStep} importState={importState} />;
  }

  if (phase === "review") {
    return (
      <ReviewScreen
        setup={setup}
        readiness={readiness}
        alertPhone={alertPhone}
        setAlertPhone={setAlertPhone}
        onApplyPhone={applyAlertPhone}
        onBack={() => setPhase("testing")}
        onContinue={() => setPhase("save")}
      />
    );
  }

  if (phase === "save") {
    return (
      <SaveScreen
        email={email}
        setEmail={setEmail}
        onBack={() => setPhase("review")}
        onContinue={saveAndContinue}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <TopBar businessName={businessName} />
      <main className="mx-auto max-w-[1460px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="purple">Test call</Badge>
              <Badge tone="neutral">Nothing is live yet</Badge>
              <Badge tone={liveState === "ready" ? "success" : liveState === "error" ? "warning" : "neutral"}>Voice preview {formatLabel(liveState)}</Badge>
              {importMessage ? <Badge tone={importState === "fallback" ? "warning" : "success"}>{importMessage}</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950">Your answering setup is ready</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">Try anything a caller might ask. Update the setup beside the call without leaving the page.</p>
          </div>
          {callEnded ? (
            <Button onClick={() => setPhase(readiness.liveReady ? "save" : "review")}>Continue <ArrowRight className="size-4" /></Button>
          ) : null}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_430px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-xl", callActive ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600")}>
                    <PhoneCall className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Test call</p>
                    <p className="mt-0.5 text-xs text-slate-500">{callActive ? liveMessage : callEnded ? "Test call ended" : "Ready when you are"}</p>
                  </div>
                </div>
                <Badge tone={callActive ? "success" : "neutral"}>{callActive ? "Active" : "Test"}</Badge>
              </div>
            </div>

            <div className="soft-grid grid min-h-[650px] lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center border-b border-slate-200/70 p-6 lg:border-b-0 lg:border-r">
                <div className="relative w-full max-w-[270px] rounded-[44px] border-[8px] border-[#17152a] bg-[#17152a] p-2 shadow-[0_32px_70px_rgba(23,21,42,.25)]">
                  <div className="min-h-[480px] rounded-[32px] bg-gradient-to-b from-[#f7f4ff] to-white p-5 text-center">
                    <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-300" />
                    <div className={cn("phone-ring mx-auto mt-14 flex size-24 items-center justify-center rounded-full", callActive ? "bg-emerald-500 text-white" : "bg-violet-600 text-white")}>
                      {callActive ? <Mic className="size-9" /> : <Sparkles className="size-9" />}
                    </div>
                    <p className="mt-8 text-lg font-bold text-slate-950">Small Business Answering</p>
                    <p className="mt-1 text-sm text-slate-500">{callActive ? "Listening" : callEnded ? "Call complete" : "Ready to answer"}</p>
                    <div className="mt-8 flex justify-center gap-4">
                      <button type="button" onClick={() => setMuted((value) => !value)} className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                      </button>
                      {!callActive ? (
                        <button type="button" onClick={startCall} className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><Phone className="size-6" /></button>
                      ) : (
                        <button type="button" onClick={endCall} className="flex size-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20"><PhoneOff className="size-6" /></button>
                      )}
                    </div>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white/75 px-3 py-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Voice preview</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{liveMessage}</p>
                      {liveRuntimeIdentity ? <p className="mt-1 text-[11px] font-semibold text-emerald-600">Secure voice preview active</p> : null}
                      {liveAudioChunks ? <p className="mt-1 text-[11px] font-semibold text-emerald-600">Voice response received</p> : null}
                    </div>
                    {!callActive && !callEnded ? <p className="mt-5 text-xs font-semibold text-slate-400">Start the call, then use a phrase on the right.</p> : null}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-white/70">
                <div className="border-b border-slate-200/70 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Transcript</p>
                  <p className="mt-1 text-xs text-slate-500">This test uses the same approved setup that powers the dashboard.</p>
                </div>
                <div className="flex-1 space-y-4 overflow-auto p-5">
                  {transcript.length ? transcript.map((turn) => (
                    <div key={turn.id} className={cn("flex", turn.speaker === "caller" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6", turn.speaker === "caller" ? "rounded-br-md bg-[#17152a] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm")}>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-55">{turn.speaker === "caller" ? "Caller" : "Answering setup"}</p>
                        {turn.text}
                      </div>
                    </div>
                  )) : (
                    <div className="flex h-full min-h-64 items-center justify-center text-center">
                      <div>
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Play className="size-5" /></div>
                        <p className="mt-4 font-semibold text-slate-800">Start the test call</p>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">The transcript, captured details, requests, alerts, and prepared actions will appear here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <aside className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600" />
                <h2 className="font-semibold text-slate-900">Try saying</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">These prompts are generated from the current answering setup.</p>
              <div className="mt-4 space-y-2.5">
                {suggestions.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => runPrompt(prompt)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50"
                  >
                    <Mic className="mt-0.5 size-4 shrink-0 text-violet-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatLabel(prompt.category)}</p>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-700">{prompt.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <WandSparkles className="size-4 text-violet-600" />
                <h2 className="font-semibold text-slate-900">Update setup</h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">Changes are checked before they update the saved answering setup.</p>

              {unknownQuestion ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Add this approved answer</p>
                  <p className="mt-1 text-sm font-semibold text-amber-950">{unknownQuestion}</p>
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Textarea value={updateText} onChange={(event) => setUpdateText(event.target.value)} placeholder="Add or change anything about the business..." className="min-h-20" />
                <Button onClick={() => void updateSetup()} disabled={!updateText.trim() || updating} className="h-auto w-12 shrink-0 px-0">
                  {updating ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
              {updateStatus ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{updateStatus}</div> : null}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">During this call</h2></div>
                <Badge tone="neutral">{outcomes.length}</Badge>
              </div>
              <div className="mt-4 space-y-2.5">
                {outcomes.length ? outcomes.map((outcome) => <Outcome key={outcome.id} outcome={outcome} />) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm leading-6 text-slate-400">Visible outputs will appear as the setup captures or prepares them.</div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TopBar({ businessName }: { businessName: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1460px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#17152a] text-white"><Sparkles className="size-4" /></span>
          <span className="font-bold tracking-tight text-slate-950">Small Business Answering</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Building2 className="size-3.5" /> {businessName}</div>
      </div>
    </header>
  );
}

function BuildingScreen({ business, activeStep, importState }: { business: string; activeStep: number; importState: ImportState }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-5 py-12">
      <Card className="w-full max-w-2xl overflow-hidden">
        <div className="bg-[#17152a] px-8 py-10 text-white">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="size-5" /></div>
          <h1 className="mt-6 text-3xl font-bold tracking-[-0.035em]">Building your answering setup</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">Reading {business} and preparing one answering setup for testing and dashboard review.</p>
        </div>
        <div className="p-7 sm:p-8">
          <div className="space-y-4">
            {buildSteps.map((step, index) => {
              const done = index < activeStep;
              const active = index === activeStep;
              return (
                <div key={step} className="flex items-center gap-3">
                  <span className={cn("flex size-8 items-center justify-center rounded-xl border", done ? "border-emerald-200 bg-emerald-50 text-emerald-600" : active ? "border-violet-200 bg-violet-50 text-violet-600" : "border-slate-200 bg-white text-slate-300")}>
                    {done ? <Check className="size-4" /> : active ? <LoaderCircle className="size-4 animate-spin" /> : <Circle className="size-3" />}
                  </span>
                  <span className={cn("text-sm font-semibold", done || active ? "text-slate-800" : "text-slate-400")}>{step}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all duration-500" style={{ width: `${((activeStep + 1) / buildSteps.length) * 100}%` }} /></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">{importState === "reading" ? "Reading website facts into the answering setup." : "No calls go live during setup."}</p>
        </div>
      </Card>
    </div>
  );
}

function Outcome({ outcome }: { outcome: OutcomeCard }) {
  const icons = {
    details: ContactRound,
    request: CalendarCheck2,
    message: MessageSquareText,
    followup: Send,
    alert: Bell,
    transfer: Route,
    urgent: ShieldAlert,
  };
  const Icon = icons[outcome.type];
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Icon className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{outcome.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{outcome.detail}</p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">{outcome.status}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewScreen({
  setup,
  readiness,
  alertPhone,
  setAlertPhone,
  onApplyPhone,
  onBack,
  onContinue,
}: {
  setup: AnsweringSetup;
  readiness: ReturnType<typeof calculateAnsweringSetupReadiness>;
  alertPhone: string;
  setAlertPhone: (value: string) => void;
  onApplyPhone: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <TopBar businessName={setup.business.name} />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Badge tone="warning">{readiness.allReviewItems.length} activation item{readiness.allReviewItems.length === 1 ? "" : "s"}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-slate-950">Before real calls are answered</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Only launch requirements appear here. These items come from the saved answering setup.</p>

        <div className="mt-7 space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Phone className="size-5" /></span>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">Where should messages and important alerts go?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Add the owner or on-call number that should receive alerts after activation.</p>
                <div className="mt-4 flex gap-2">
                  <Input value={alertPhone} onChange={(event) => setAlertPhone(event.target.value)} placeholder="Phone number" />
                  <Button variant="secondary" onClick={onApplyPhone} disabled={!alertPhone.trim()}>Use number</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Clock3 className="size-5" /></span>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">After-hours handling</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{setup.hours.afterHours.callerWording}</p>
                <Select className="mt-4" value={setup.hours.afterHours.mode} disabled>
                  <option value="take_message">Take a message</option>
                  <option value="urgent_only">Urgent only</option>
                  <option value="send_booking_link">Send booking link</option>
                  <option value="closed_message">Closed message</option>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="size-4" /> Back to test</Button>
          <Button onClick={onContinue}>Save setup <ArrowRight className="size-4" /></Button>
        </div>
      </main>
    </div>
  );
}

function SaveScreen({ email, setEmail, onBack, onContinue }: { email: string; setEmail: (value: string) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-5 py-12">
      <Card className="w-full max-w-lg p-7 sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Save className="size-5" /></div>
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.035em] text-slate-950">Save your answering setup</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Keep this setup, owner updates, and test call so you can continue or activate it later.</p>
        <button onClick={onContinue} className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 text-xs font-bold text-white">G</span>
          Continue with Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
        <Field label="Work email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
        </Field>
        <Button className="mt-3 w-full" onClick={onContinue} disabled={!email.trim()}><Mail className="size-4" /> Email me a secure link</Button>
        <p className="mt-4 text-center text-xs leading-5 text-slate-400">Creates a free Small Business Answering account. No card required.</p>
        <button onClick={onBack} className="mt-5 w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800">Back</button>
      </Card>
    </div>
  );
}
