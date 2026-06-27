"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  MessageSquareText,
  Mic,
  PhoneCall,
  ShieldAlert,
  TestTube2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  demoAnsweringSetup,
  generateSetupTestPrompts,
  labelSbaValue,
  renderOwnerAlertTemplatePreview,
  type AnsweringSetup,
  type SuggestedSetupTestPrompt,
} from "@/domain/small-business-answering";
import {
  loadSbaWorkspace,
  saveSbaWorkspace,
  type StoredTestCall,
} from "@/lib/sba-client-storage";
import { cn } from "@/lib/utils";

const categoryIcons = {
  approved_answer: CheckCircle2,
  service: PhoneCall,
  appointment: CalendarCheck2,
  message: MessageSquareText,
  urgent: ShieldAlert,
  unknown: TestTube2,
};

function buildTestCall(setup: AnsweringSetup, prompt: SuggestedSetupTestPrompt): StoredTestCall {
  const now = new Date().toISOString();
  const service = setup.services.find((item) => item.id === prompt.sourceId) ?? setup.services.find((item) => item.enabled);
  const approvedAnswer = setup.approvedAnswers.find((item) => item.id === prompt.sourceId) ?? setup.approvedAnswers.find((item) => !item.needsReview);
  const base = [
    { id: "turn_greeting", speaker: "setup" as const, text: setup.callHandling.callerGreeting },
    { id: "turn_prompt", speaker: "caller" as const, text: prompt.prompt },
  ];

  if (prompt.category === "appointment") {
    return {
      id: `test-call-${Date.now()}`,
      startedAt: now,
      summary: "Appointment request captured from the test call.",
      setupRevision: setup.status.draftRevision,
      transcript: [
        ...base,
        { id: "turn_collect", speaker: "setup", text: "I can help collect the details. May I have your name, phone number, service needed, and preferred time?" },
        { id: "turn_details", speaker: "caller", text: "My name is Jamie. My number is 204-555-0184. Thursday afternoon would work." },
        { id: "turn_confirm", speaker: "setup", text: setup.requestCapture.callerSummaryWording },
      ],
      outcomes: [
        { id: "outcome_request", type: "request", title: "Appointment request captured", detail: "Preferred time: Thursday afternoon", status: "Follow-up needed" },
        {
          id: "outcome_alert",
          type: "alert",
          title: "Owner alert prepared",
          detail: renderOwnerAlertTemplatePreview(setup.ownerAlerts.messageTemplate, {
            caller_name: "Jamie",
            phone: "204-555-0184",
            reason: "an appointment request",
            service_needed: "service needed",
            preferred_time: "Thursday afternoon",
          }),
          status: "Prepared",
        },
      ],
    };
  }

  if (prompt.category === "urgent") {
    return {
      id: `test-call-${Date.now()}`,
      startedAt: now,
      summary: "Urgent caller details captured for owner review.",
      setupRevision: setup.status.draftRevision,
      transcript: [
        ...base,
        { id: "turn_urgent", speaker: "setup", text: setup.hours.afterHours.urgentWording ?? "I can collect the urgent details and alert the right person." },
        { id: "turn_details", speaker: "caller", text: "Please have someone call me back as soon as possible." },
      ],
      outcomes: [
        { id: "outcome_urgent", type: "urgent", title: "Urgent request captured", detail: "Caller asked for a same-day response.", status: "Prepared" },
      ],
    };
  }

  if (prompt.category === "message") {
    return {
      id: `test-call-${Date.now()}`,
      startedAt: now,
      summary: "Callback message captured from the test call.",
      setupRevision: setup.status.draftRevision,
      transcript: [
        ...base,
        { id: "turn_message", speaker: "setup", text: "Absolutely. I can take a message and send it to the team." },
        { id: "turn_details", speaker: "caller", text: "Please ask someone to call me tomorrow morning." },
      ],
      outcomes: [
        { id: "outcome_message", type: "message", title: "Message captured", detail: "Caller requested a callback tomorrow morning.", status: "Prepared" },
      ],
    };
  }

  if (prompt.category === "unknown") {
    return {
      id: `test-call-${Date.now()}`,
      startedAt: now,
      summary: "Unknown question was handled safely and flagged for review.",
      setupRevision: setup.status.draftRevision,
      transcript: [
        ...base,
        { id: "turn_unknown", speaker: "setup", text: "I am not sure about that yet, but I can take your question and have the team follow up." },
      ],
      outcomes: [
        { id: "outcome_unknown", type: "request", title: "Question flagged for review", detail: "The answer was not in the approved setup.", status: "Needs review" },
      ],
    };
  }

  if (prompt.category === "service" && service) {
    return {
      id: `test-call-${Date.now()}`,
      startedAt: now,
      summary: `${service.name} question answered from the approved setup.`,
      setupRevision: setup.status.draftRevision,
      transcript: [
        ...base,
        { id: "turn_service", speaker: "setup", text: service.approvedDescription ?? `The team can help with ${service.name}.` },
        { id: "turn_offer", speaker: "setup", text: "Would you like me to collect your details for the team?" },
      ],
      outcomes: [
        { id: "outcome_answered", type: "answer", title: "Service question answered", detail: service.name, status: "Completed" },
      ],
    };
  }

  return {
    id: `test-call-${Date.now()}`,
    startedAt: now,
    summary: "Approved business answer tested successfully.",
    setupRevision: setup.status.draftRevision,
    transcript: [
      ...base,
      { id: "turn_answer", speaker: "setup", text: approvedAnswer?.answer ?? "I can collect that question and ask the team to follow up." },
    ],
    outcomes: [
      { id: "outcome_answered", type: "answer", title: "Approved answer used", detail: approvedAnswer?.question ?? prompt.prompt, status: "Completed" },
    ],
  };
}

export function TestCenterClient() {
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const [testCall, setTestCall] = useState<StoredTestCall | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (cancelled) return;
      if (workspace.setup) setSetup(workspace.setup);
      setTestCall(workspace.testCall ?? null);
    });
    refreshWorkspace();
    window.addEventListener("sba-workspace-updated", refreshWorkspace);
    window.addEventListener("storage", refreshWorkspace);
    return () => {
      cancelled = true;
      window.removeEventListener("sba-workspace-updated", refreshWorkspace);
      window.removeEventListener("storage", refreshWorkspace);
    };
  }, []);

  const prompts = useMemo(() => generateSetupTestPrompts(setup), [setup]);
  const selectedPrompt = prompts.find((prompt) => prompt.id === selectedPromptId) ?? prompts[0];
  const latestOutcome = testCall?.outcomes[0] ?? null;

  async function runSelectedTest() {
    if (!selectedPrompt) return;
    setIsSaving(true);
    try {
      const nextCall = buildTestCall(setup, selectedPrompt);
      const nextSetup = structuredClone(setup);
      nextSetup.status.mode = nextSetup.status.isLive ? "live" : "testing";
      nextSetup.status.lastTestedAt = nextCall.startedAt;
      const saved = await saveSbaWorkspace({ setup: nextSetup, testCall: nextCall });
      setSetup(saved.setup ?? nextSetup);
      setTestCall(saved.testCall ?? nextCall);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Test Center</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Choose a caller, run the call, and review what the business would receive.</p>
        </div>
        <Link href="/dashboard/answering-setup" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Edit setup <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="p-4 xl:sticky xl:top-5 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Choose a caller</h2>
              <p className="mt-1 text-sm text-slate-500">{prompts.length} scenarios from the current setup</p>
            </div>
            {selectedPrompt ? <Badge tone="neutral">{labelSbaValue(selectedPrompt.category)}</Badge> : null}
          </div>

          <div className="mt-4 max-h-[54vh] space-y-2 overflow-auto pr-1">
            {prompts.map((prompt) => {
              const Icon = categoryIcons[prompt.category];
              const selected = selectedPrompt?.id === prompt.id;
              return (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => setSelectedPromptId(prompt.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition",
                    selected ? "border-[#17152a] bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", selected ? "bg-white/12 text-white" : "bg-slate-100 text-slate-600")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-xs font-semibold", selected ? "text-white/70" : "text-slate-400")}>{labelSbaValue(prompt.category)}</span>
                      <span className="mt-1 block text-sm font-semibold leading-5">{prompt.prompt}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <Button onClick={runSelectedTest} disabled={!selectedPrompt || isSaving} className="mt-4 w-full">
            <Mic className="size-4" /> {isSaving ? "Running test..." : "Run this test"}
          </Button>
        </Card>

        <div ref={resultRef} className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{testCall ? "Review this test" : "Preview the call"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{testCall ? "This is what the business can inspect before going live." : "Run the selected scenario to create a call review."}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_.85fr]">
              <div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="size-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-950">{selectedPrompt ? "Caller asks" : "No scenario selected"}</p>
                  </div>
                  <p className="mt-3 text-base font-semibold leading-7 text-slate-800">{selectedPrompt?.prompt ?? "Choose a caller scenario."}</p>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Transcript</p>
                    <Badge tone="neutral" className="border-white/15 bg-white/10 text-white">{testCall ? `${testCall.transcript.length} turns` : "Preview"}</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(testCall?.transcript ?? [
                      { id: "preview_setup", speaker: "setup" as const, text: setup.callHandling.callerGreeting },
                      { id: "preview_caller", speaker: "caller" as const, text: selectedPrompt?.prompt ?? "Caller question appears here." },
                    ]).map((turn) => (
                      <div key={turn.id} className={cn("flex", turn.speaker === "caller" && "justify-end")}>
                        <div className={cn("max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6", turn.speaker === "caller" ? "bg-white text-slate-900" : "bg-white/10 text-white")}>
                          <span className="mb-1 block text-[10px] font-bold uppercase text-current opacity-55">{turn.speaker === "caller" ? "Caller" : "Answering service"}</span>
                          {turn.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn("size-4", latestOutcome ? "text-emerald-600" : "text-slate-300")} />
                    <p className="text-sm font-semibold text-slate-950">Result</p>
                  </div>
                  {testCall ? (
                    <>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{testCall.summary}</p>
                      <div className="mt-4 space-y-2">
                        {testCall.outcomes.map((outcome) => (
                          <div key={outcome.id} className="rounded-lg bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{outcome.title}</p>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{outcome.detail}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-500">After the test runs, the summary, captured request, and prepared owner message show here.</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <Fact label="Latest test" value={testCall ? new Date(testCall.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "None"} />
                  <Fact label="Requests" value={String(testCall?.outcomes.filter((item) => item.type === "request" || item.type === "urgent").length ?? 0)} />
                  <Fact label="Owner alerts" value={testCall?.outcomes.some((item) => item.type === "alert") ? "Prepared" : "None"} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/dashboard/calls/test-call" className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                    testCall ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "pointer-events-none border border-slate-100 bg-slate-50 text-slate-300",
                  )}>
                    Review full call <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/dashboard/requests" className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                    testCall ? "bg-[#17152a] text-white hover:bg-[#292541]" : "pointer-events-none bg-slate-200 text-slate-400",
                  )}>
                    View requests <ArrowRight className="size-4" />
                  </Link>
                </div>
              </aside>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
