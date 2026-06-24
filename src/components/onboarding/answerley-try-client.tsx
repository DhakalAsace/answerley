"use client";

import { useEffect, useMemo, useState } from "react";
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
import { genericAnsweringPlanFixture } from "@/domain/answering-plan/fixtures";
import { applyPlanChange, type PlanChangeProposal } from "@/domain/answering-plan/patches";
import { calculatePlanReadiness } from "@/domain/answering-plan/readiness";
import type { AnsweringPlanEnvelope } from "@/domain/answering-plan/schema";
import { generateSuggestedTestPrompts, type SuggestedTestPrompt } from "@/domain/answering-plan/selectors";
import type { PlanAssistantResult } from "@/integrations/gemini/plan-assistant";
import { cn, formatLabel } from "@/lib/utils";

type Phase = "building" | "testing" | "review" | "save";
type TranscriptTurn = { id: string; speaker: "caller" | "answerley"; text: string };
let localIdCounter = 0;
function nextLocalId(prefix: string) {
  localIdCounter += 1;
  return `${prefix}_${localIdCounter}`;
}

type OutcomeCard = {
  id: string;
  type: "details" | "request" | "message" | "followup" | "alert" | "transfer";
  title: string;
  detail: string;
  status: string;
};

const buildSteps = [
  "Finding what the business offers",
  "Checking hours and locations",
  "Reading FAQs and policies",
  "Finding booking and contact links",
  "Preparing call handling",
  "Configuring the test assistant",
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

function createPlan(input: string): AnsweringPlanEnvelope {
  const plan = structuredClone(genericAnsweringPlanFixture);
  const businessName = deriveBusinessName(input);
  plan.document.businessProfile.businessName = businessName;
  plan.document.businessProfile.websiteUrl = input.includes(".")
    ? input.startsWith("http")
      ? input
      : `https://${input}`
    : null;
  plan.document.greetingVoice.openingGreeting = `Thanks for calling ${businessName}. How can I help you today?`;
  plan.fieldMetadata["/businessProfile/businessName"] = {
    sourceType: "website",
    sources: [],
    confidence: 0.92,
    confirmedByUser: false,
    confirmedAt: null,
    lastChangedBy: "website_builder",
    lastChangedAt: new Date().toISOString(),
    conflicts: [],
    note: "Foundation slice fixture. Replace through the website builder integration.",
  };
  return plan;
}

export function AnswerleyTryClient({
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
  const [phase, setPhase] = useState<Phase>(previewPhase);
  const [buildStep, setBuildStep] = useState(preview === "building-complete" ? buildSteps.length - 1 : 0);
  const [plan, setPlan] = useState<AnsweringPlanEnvelope>(() => createPlan(businessInput));
  const [callActive, setCallActive] = useState(false);
  const [callEnded, setCallEnded] = useState(previewPopulated);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>(() =>
    previewPopulated
      ? [
          { id: "preview_turn_1", speaker: "answerley", text: "Thanks for calling Example. How can I help you today?" },
          { id: "preview_turn_2", speaker: "caller", text: "I would like to request a consultation for Thursday afternoon." },
          { id: "preview_turn_3", speaker: "answerley", text: "Absolutely. I have your request and contact details ready for the team." },
        ]
      : [],
  );
  const [outcomes, setOutcomes] = useState<OutcomeCard[]>(() =>
    previewPopulated
      ? [
          { id: "preview_outcome_1", type: "details", title: "Contact details collected", detail: "Jamie · 204-555-0184", status: "Captured" },
          { id: "preview_outcome_2", type: "request", title: "Request captured", detail: "Consultation · Thursday afternoon", status: "Test request" },
          { id: "preview_outcome_3", type: "alert", title: "Owner alert prepared", detail: "New consultation request from Jamie", status: "Ready after activation" },
        ]
      : [],
  );
  const [unknownQuestion, setUnknownQuestion] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [alertPhone, setAlertPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (phase !== "building") return;
    const interval = window.setInterval(() => {
      setBuildStep((current) => {
        if (current >= buildSteps.length - 1) {
          window.clearInterval(interval);
          window.setTimeout(() => setPhase("testing"), 650);
          return current;
        }
        return current + 1;
      });
    }, 540);
    return () => window.clearInterval(interval);
  }, [phase]);

  const suggestions = useMemo(() => generateSuggestedTestPrompts(plan), [plan]);
  const readiness = useMemo(() => calculatePlanReadiness(plan), [plan]);
  const businessName = plan.document.businessProfile.businessName ?? "Your Business";

  function startCall() {
    setCallActive(true);
    setCallEnded(false);
    setTranscript([
      {
        id: nextLocalId("turn"),
        speaker: "answerley",
        text: plan.document.greetingVoice.openingGreeting ?? `Thanks for calling ${businessName}. How can I help?`,
      },
    ]);
  }

  function endCall() {
    setCallActive(false);
    setCallEnded(true);
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

  function runPrompt(prompt: SuggestedTestPrompt) {
    if (!callActive) startCall();
    setUnknownQuestion(null);
    window.setTimeout(() => addTurn("caller", prompt.prompt), 120);
    window.setTimeout(() => {
      if (prompt.category === "knowledge") {
        const knowledge = plan.document.knowledgeItems.find((item) => item.id === prompt.sourceId) ?? plan.document.knowledgeItems[0];
        addTurn("answerley", knowledge?.answer ?? "The business is open Monday through Friday from 9 AM to 5 PM Central Time.");
        return;
      }
      if (prompt.category === "offering") {
        const offering = plan.document.offerings.find((item) => item.id === prompt.sourceId) ?? plan.document.offerings[0];
        addTurn("answerley", offering?.description ?? "I can tell you about the services the business provides.");
        return;
      }
      if (prompt.category === "request") {
        addTurn("answerley", "Absolutely. May I have your name, callback number, and preferred time?");
        window.setTimeout(() => {
          addTurn("caller", "My name is Jamie. My number is 204-555-0184, and Thursday afternoon works.");
          addOutcome({ type: "details", title: "Contact details collected", detail: "Jamie · 204-555-0184", status: "Captured" });
          addOutcome({ type: "request", title: "Request captured", detail: "Consultation · Thursday afternoon", status: "Test request" });
          addOutcome({ type: "alert", title: "Owner alert prepared", detail: "New consultation request from Jamie", status: "Ready after activation" });
          window.setTimeout(() => addTurn("answerley", "Thanks, Jamie. I have your request and preferred time ready for the team."), 280);
        }, 420);
        return;
      }
      if (prompt.category === "message") {
        addTurn("answerley", "Of course. What message would you like me to pass along, and what is the best number to reach you?");
        window.setTimeout(() => {
          addTurn("caller", "Please ask someone to call me tomorrow at 204-555-0119.");
          addOutcome({ type: "message", title: "Message captured", detail: "Please call tomorrow · 204-555-0119", status: "Ready for the business" });
          addOutcome({ type: "followup", title: "Follow-up prepared", detail: "Message received confirmation", status: "Ready after activation" });
          window.setTimeout(() => addTurn("answerley", "I have the message and callback number ready for the team."), 260);
        }, 420);
        return;
      }

      const question = "Do you provide a warranty?";
      addTurn("caller", question);
      window.setTimeout(() => {
        addTurn("answerley", plan.document.knowledgeItems.some((item) => /warranty/i.test(item.title + item.question))
          ? plan.document.knowledgeItems.find((item) => /warranty/i.test(item.title + item.question))!.answer
          : plan.document.unknownHandling.callerWording,
        );
        if (!plan.document.knowledgeItems.some((item) => /warranty/i.test(item.title + item.question))) {
          setUnknownQuestion(question);
          setUpdateText("We provide a one-year warranty on approved work.");
        }
      }, 260);
    }, 420);
  }

  async function updatePlan() {
    const instruction = updateText.trim();
    if (!instruction) return;
    setUpdating(true);
    setUpdateStatus(null);
    try {
      const fullInstruction = unknownQuestion
        ? `Add an approved answer for the question \"${unknownQuestion}\": ${instruction}`
        : instruction;
      const response = await fetch("/api/dev/plan-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, instruction: fullInstruction, useGemini: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Update failed.");
      const result = body.result as PlanAssistantResult;
      if (result.type === "proposal") {
        const applied = applyPlanChange(plan, result.proposal);
        setPlan(applied.plan);
        setUpdateStatus("Updated. Answerley can use this now.");
        setUnknownQuestion(null);
        setUpdateText("");
      } else if (result.type === "answer") {
        setUpdateStatus(result.answer);
      } else {
        setUpdateStatus(`${result.question}${result.choices.length ? ` ${result.choices.join(" · ")}` : ""}`);
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
    const contactIndex = plan.document.routing.contacts.findIndex((contact) => contact.id === "contact_primary");
    if (contactIndex < 0) return;
    const proposal: PlanChangeProposal = {
      id: nextLocalId("review"),
      baseRevision: plan.revision,
      source: "manual_ui",
      summary: "Add owner alert phone",
      userInstruction: null,
      riskLevel: "high",
      requiresConfirmation: true,
      operations: [{ op: "replace", path: `/routing/contacts/${contactIndex}/phone`, value: phone }],
      affectedPaths: [`/routing/contacts/${contactIndex}/phone`],
      conflicts: [],
      clarification: null,
    };
    setPlan(applyPlanChange(plan, proposal).plan);
  }

  function saveAndContinue() {
    const testCall = {
      id: "test-call-1",
      startedAt: new Date().toISOString(),
      summary: transcript.length
        ? "Tested business questions, request handling, and message capture."
        : "Browser test call completed.",
      transcript,
      outcomes,
      planRevision: plan.revision,
    };
    window.localStorage.setItem("answerley-foundation-plan", JSON.stringify(plan));
    window.localStorage.setItem("answerley-foundation-test-call", JSON.stringify(testCall));
    router.push("/app/calls");
  }

  if (phase === "building") {
    return <BuildingScreen business={businessInput} activeStep={buildStep} />;
  }

  if (phase === "review") {
    return (
      <ReviewScreen
        plan={plan}
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
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950">Your Answerley assistant is ready</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">Try anything a customer might ask. Update business information beside the call without leaving the page.</p>
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
                    <p className="font-semibold text-slate-900">Browser test</p>
                    <p className="mt-0.5 text-xs text-slate-500">{callActive ? "Connected · Answerley is listening" : callEnded ? "Test call ended" : "Ready when you are"}</p>
                  </div>
                </div>
                <Badge tone={callActive ? "success" : "neutral"}>{callActive ? "Live" : "Test"}</Badge>
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
                    <p className="mt-8 text-lg font-bold text-slate-950">Answerley</p>
                    <p className="mt-1 text-sm text-slate-500">{callActive ? "Listening…" : callEnded ? "Call complete" : "Ready to answer"}</p>
                    <div className="mt-12 flex justify-center gap-4">
                      <button type="button" onClick={() => setMuted((value) => !value)} className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                      </button>
                      {!callActive ? (
                        <button type="button" onClick={startCall} className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><Phone className="size-6" /></button>
                      ) : (
                        <button type="button" onClick={endCall} className="flex size-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20"><PhoneOff className="size-6" /></button>
                      )}
                    </div>
                    {!callActive && !callEnded ? <p className="mt-5 text-xs font-semibold text-slate-400">Start the call, then use a phrase on the right.</p> : null}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-white/70">
                <div className="border-b border-slate-200/70 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">Live transcript</p>
                  <p className="mt-1 text-xs text-slate-500">The production slice connects this surface to Gemini Live.</p>
                </div>
                <div className="flex-1 space-y-4 overflow-auto p-5">
                  {transcript.length ? transcript.map((turn) => (
                    <div key={turn.id} className={cn("flex", turn.speaker === "caller" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6", turn.speaker === "caller" ? "rounded-br-md bg-[#17152a] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm")}>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-55">{turn.speaker === "caller" ? "Caller" : "Answerley"}</p>
                        {turn.text}
                      </div>
                    </div>
                  )) : (
                    <div className="flex h-full min-h-64 items-center justify-center text-center">
                      <div>
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Play className="size-5" /></div>
                        <p className="mt-4 font-semibold text-slate-800">Start the test call</p>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">The transcript, collected details, requests, messages, and prepared actions will appear as the conversation happens.</p>
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
              <p className="mt-1 text-sm text-slate-500">Use these as speaking prompts during the one test call.</p>
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
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-700">“{prompt.prompt}”</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <WandSparkles className="size-4 text-violet-600" />
                <h2 className="font-semibold text-slate-900">Update Answerley</h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">Add or change business information while the test stays on this page.</p>

              {unknownQuestion ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Add this information</p>
                  <p className="mt-1 text-sm font-semibold text-amber-950">“{unknownQuestion}”</p>
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Textarea value={updateText} onChange={(event) => setUpdateText(event.target.value)} placeholder="Add or change anything about the business…" className="min-h-20" />
                <Button onClick={() => void updatePlan()} disabled={!updateText.trim() || updating} className="h-auto w-12 shrink-0 px-0">
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
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm leading-6 text-slate-400">Visible outputs will appear as Answerley captures or prepares them.</div>
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
          <span className="font-bold tracking-tight text-slate-950">Answerley</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Building2 className="size-3.5" /> {businessName}</div>
      </div>
    </header>
  );
}

function BuildingScreen({ business, activeStep }: { business: string; activeStep: number }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-5 py-12">
      <Card className="w-full max-w-2xl overflow-hidden">
        <div className="bg-[#17152a] px-8 py-10 text-white">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="size-5" /></div>
          <h1 className="mt-6 text-3xl font-bold tracking-[-0.035em]">Building your Answerley assistant…</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">Reading {business} and preparing one structured Answering Plan for the test and dashboard.</p>
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
  plan,
  readiness,
  alertPhone,
  setAlertPhone,
  onApplyPhone,
  onBack,
  onContinue,
}: {
  plan: AnsweringPlanEnvelope;
  readiness: ReturnType<typeof calculatePlanReadiness>;
  alertPhone: string;
  setAlertPhone: (value: string) => void;
  onApplyPhone: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <TopBar businessName={plan.document.businessProfile.businessName ?? "Your Business"} />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Badge tone="warning">{readiness.counts.critical} quick decision{readiness.counts.critical === 1 ? "" : "s"}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-slate-950">Before Answerley handles real calls</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Only live-critical gaps appear here. Optional configuration stays in the dashboard.</p>

        <div className="mt-7 space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Phone className="size-5" /></span>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">Where should messages and important alerts go?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Add the number Answerley should use after activation.</p>
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
                <p className="mt-1 text-sm leading-6 text-slate-500">Answerley currently takes a message using the generated plan.</p>
                <Select className="mt-4" value={plan.document.hoursAvailability.afterHours.mode} disabled>
                  <option value="take_message">Take a message</option>
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
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.035em] text-slate-950">Save your Answerley setup</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Keep the business information, Answering Plan, updates, and test call so you can continue or activate it later.</p>
        <button onClick={onContinue} className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 text-xs font-bold text-white">G</span>
          Continue with Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
        <Field label="Work email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
        </Field>
        <Button className="mt-3 w-full" onClick={onContinue} disabled={!email.trim()}><Mail className="size-4" /> Email me a secure link</Button>
        <p className="mt-4 text-center text-xs leading-5 text-slate-400">Creates a free Answerley account. No card required.</p>
        <button onClick={onBack} className="mt-5 w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800">Back</button>
      </Card>
    </div>
  );
}
