"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  Check,
  CheckCircle2,
  CircleDot,
  Download,
  FlaskConical,
  Info,
  LoaderCircle,
  MessageSquarePlus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { FoundationHeader } from "@/components/foundation/foundation-header";
import { FieldStateBadge } from "@/components/plan/field-state-badge";
import { PlanSectionEditor } from "@/components/plan/plan-section-editor";
import { RuntimePanel } from "@/components/plan/runtime-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Textarea } from "@/components/ui/textarea";
import {
  fieldRegistry,
  planSections,
  type PlanSectionId,
} from "@/domain/answering-plan/field-registry";
import { genericAnsweringPlanFixture } from "@/domain/answering-plan/fixtures";
import {
  applyPlanChange,
  createManualChange,
  type PlanChangeProposal,
} from "@/domain/answering-plan/patches";
import { calculatePlanReadiness } from "@/domain/answering-plan/readiness";
import type { LiveRuntimePack } from "@/domain/answering-plan/runtime/schema";
import type { AnsweringPlanEnvelope } from "@/domain/answering-plan/schema";
import { deriveFieldState, generateSuggestedTestPrompts } from "@/domain/answering-plan/selectors";
import type { PlanAssistantResult } from "@/integrations/gemini/plan-assistant";
import { cn, formatLabel } from "@/lib/utils";

const initialPlan = () => structuredClone(genericAnsweringPlanFixture);

type AssistantState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; result: PlanAssistantResult; provider: string }
  | { status: "error"; message: string };

function SectionStatusIcon({ status }: { status: "ready" | "needs_review" | "blocked" }) {
  if (status === "ready") return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (status === "needs_review") return <Info className="size-4 text-amber-600" />;
  return <AlertTriangle className="size-4 text-red-600" />;
}

export function AnsweringPlanLabClient() {
  const [plan, setPlan] = useState<AnsweringPlanEnvelope>(initialPlan);
  const [selectedSection, setSelectedSection] = useState<PlanSectionId>("offerings");
  const [runtime, setRuntime] = useState<LiveRuntimePack | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [runtimeCompiler, setRuntimeCompiler] = useState("");
  const [runtimeMode, setRuntimeMode] = useState<"test" | "live">("test");
  const [assistantInstruction, setAssistantInstruction] = useState("");
  const [assistantState, setAssistantState] = useState<AssistantState>({ status: "idle" });
  const [showJson, setShowJson] = useState(false);
  const [lastChange, setLastChange] = useState<{ summary: string; paths: string[] } | null>(null);

  const readiness = useMemo(() => calculatePlanReadiness(plan), [plan]);
  const suggestedPrompts = useMemo(() => generateSuggestedTestPrompts(plan), [plan]);
  const sectionReadiness = useMemo(
    () => new Map(readiness.sections.map((item) => [item.section, item])),
    [readiness],
  );

  const compileRuntime = useCallback(async (candidate: AnsweringPlanEnvelope, mode: "test" | "live") => {
    setRuntimeLoading(true);
    try {
      const response = await fetch("/api/dev/compile-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: candidate, mode }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Compilation failed.");
      setRuntime(body.runtime);
      setRuntimeCompiler(body.compiler);
    } catch (error) {
      setRuntime(null);
      setRuntimeCompiler(error instanceof Error ? error.message : "Compilation failed");
    } finally {
      setRuntimeLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void compileRuntime(plan, runtimeMode), 220);
    return () => window.clearTimeout(timeout);
  }, [plan, runtimeMode, compileRuntime]);

  const applyProposal = useCallback((proposal: PlanChangeProposal) => {
    try {
      const applied = applyPlanChange(plan, proposal);
      setPlan(applied.plan);
      setLastChange({ summary: proposal.summary, paths: applied.changedPaths });
      setAssistantState({ status: "idle" });
    } catch (error) {
      setAssistantState({
        status: "error",
        message: error instanceof Error ? error.message : "The plan change could not be applied.",
      });
    }
  }, [plan]);

  const commit = useCallback((
    path: string,
    value: unknown,
    summary: string,
    risk: "low" | "medium" | "high" = "low",
  ) => {
    const proposal = createManualChange({
      plan,
      summary,
      riskLevel: risk,
      operations: [{ op: path.endsWith("/-") ? "add" : "replace", path, value }],
    });
    try {
      const applied = applyPlanChange(plan, proposal);
      setPlan(applied.plan);
      setLastChange({ summary, paths: applied.changedPaths });
    } catch (error) {
      setAssistantState({
        status: "error",
        message: error instanceof Error ? error.message : "The manual change could not be applied.",
      });
    }
  }, [plan]);

  async function askAssistant() {
    const instruction = assistantInstruction.trim();
    if (!instruction) return;
    setAssistantState({ status: "loading" });
    try {
      const response = await fetch("/api/dev/plan-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, instruction }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Assistant request failed.");
      setAssistantState({ status: "result", result: body.result, provider: body.provider });
      setAssistantInstruction("");
    } catch (error) {
      setAssistantState({
        status: "error",
        message: error instanceof Error ? error.message : "Assistant request failed.",
      });
    }
  }

  const selectedDefinition = planSections.find((item) => item.id === selectedSection)!;
  const selectedFields = fieldRegistry.filter((field) => field.section === selectedSection);

  function resetPlan() {
    setPlan(initialPlan());
    setLastChange(null);
    setAssistantState({ status: "idle" });
  }

  function exportPlan() {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `answering-plan-revision-${plan.revision}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <FoundationHeader active="/dev/answering-plan-lab" />

      <main className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="purple">Canonical contract</Badge>
              <Badge tone="neutral">Revision {plan.revision}</Badge>
              <Badge tone={readiness.testReady ? "success" : "danger"}>
                {readiness.testReady ? "Test-ready" : "Test blocked"}
              </Badge>
              <Badge tone={readiness.liveReady ? "success" : "warning"}>
                {readiness.liveReady ? "Live-ready" : `${readiness.counts.critical} live decision${readiness.counts.critical === 1 ? "" : "s"}`}
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950">Answering Plan Lab</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              One structured plan powers visual editing, natural-language changes, readiness checks, test prompts, and the layered Gemini Live runtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowJson((value) => !value)}>
              <Braces className="size-4" /> {showJson ? "Hide JSON" : "View JSON"}
            </Button>
            <Button variant="secondary" onClick={exportPlan}>
              <Download className="size-4" /> Export
            </Button>
            <Button variant="secondary" onClick={resetPlan}>
              <RotateCcw className="size-4" /> Reset fixture
            </Button>
          </div>
        </div>

        {lastChange ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-800">
              <Check className="size-4" />
              <span><strong>{lastChange.summary}</strong> — plan, dashboard preview, and runtime will refresh together.</span>
            </div>
            <button className="text-xs font-semibold text-emerald-700" onClick={() => setLastChange(null)}>Dismiss</button>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_420px]">
          <aside className="self-start xl:sticky xl:top-[84px]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Plan sections</p>
              </div>
              <div className="max-h-[calc(100vh-150px)] overflow-auto p-2">
                {planSections.map((item) => {
                  const status = sectionReadiness.get(item.id)?.status ?? "ready";
                  const current = selectedSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSection(item.id)}
                      className={cn(
                        "mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                        current
                          ? "bg-[#17152a] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                      )}
                    >
                      <span className="truncate font-semibold">{item.label}</span>
                      {current ? <CircleDot className="size-3.5 text-violet-300" /> : <SectionStatusIcon status={status} />}
                    </button>
                  );
                })}
              </div>
            </Card>
          </aside>

          <section className="min-w-0 space-y-5">
            {showJson ? (
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">Canonical JSONB document</h2>
                    <p className="mt-1 text-sm text-slate-500">This is what Supabase stores and every configuration surface reads.</p>
                  </div>
                  <Badge tone="neutral">schema {plan.document.schemaVersion}</Badge>
                </div>
                <CodeBlock value={JSON.stringify(plan, null, 2)} />
              </Card>
            ) : (
              <Card className="p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Dashboard configuration preview</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedDefinition.dashboardSurface}</p>
                  </div>
                  <Badge tone="neutral">Runtime: {selectedDefinition.runtimeLayer}</Badge>
                </div>
                <PlanSectionEditor section={selectedSection} plan={plan} commit={commit} />
              </Card>
            )}

            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="size-5 text-violet-600" />
                    <h2 className="text-lg font-semibold text-slate-950">Update Answerley</h2>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    The owner-side Gemini Flash assistant reads the current plan, answers questions, asks for clarification, or proposes a surgical patch.
                  </p>
                </div>
                <Badge tone="purple">Same write path as manual UI</Badge>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <Textarea
                  value={assistantInstruction}
                  onChange={(event) => setAssistantInstruction(event.target.value)}
                  placeholder="Try: Don’t quote prices. What happens after hours? We close at 4 PM on Fridays."
                  className="min-h-24"
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void askAssistant();
                  }}
                />
                <Button className="h-auto min-h-12 md:w-36" onClick={() => void askAssistant()} disabled={!assistantInstruction.trim() || assistantState.status === "loading"}>
                  {assistantState.status === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Ask
                </Button>
              </div>

              {assistantState.status === "error" ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{assistantState.message}</div>
              ) : null}

              {assistantState.status === "result" ? (
                <AssistantResultCard state={assistantState} onApply={applyProposal} onDismiss={() => setAssistantState({ status: "idle" })} />
              ) : null}
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">Suggested test phrases</h2>
                  <p className="mt-1 text-sm text-slate-500">Generated from the current Answering Plan—not stored as a second configuration.</p>
                </div>
                <FlaskConical className="size-5 text-violet-600" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {suggestedPrompts.map((prompt) => (
                  <div key={prompt.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <Badge tone="neutral">{formatLabel(prompt.category)}</Badge>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-800">“{prompt.prompt}”</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <aside className="min-w-0 space-y-5 self-start xl:sticky xl:top-[84px] xl:max-h-[calc(100vh-104px)] xl:overflow-auto xl:pr-1">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-violet-600" />
                    <h2 className="font-semibold text-slate-900">Readiness</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Calculated from values, modes, references, and metadata.</p>
                </div>
                <Badge tone={readiness.liveReady ? "success" : "warning"}>{readiness.liveReady ? "Ready" : `${readiness.counts.critical} critical`}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {readiness.issues.length ? readiness.issues.slice(0, 5).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedSection(item.section)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40"
                  >
                    <div className="flex items-start gap-2.5">
                      {item.level === "critical" ? <AlertTriangle className="mt-0.5 size-4 text-red-500" /> : <Info className="mt-0.5 size-4 text-amber-500" />}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.resolutionHint}</p>
                      </div>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">No unresolved live-critical items.</div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">Field contract: {selectedDefinition.label}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Every nuance is registered once so UI, Gemini, readiness, and runtime stay aligned.</p>
              <div className="mt-4 space-y-3">
                {selectedFields.length ? selectedFields.slice(0, 12).map((field) => {
                  const issue = readiness.issues.find((item) => item.path === field.pathPattern);
                  const state = field.pathPattern.includes("*")
                    ? "found"
                    : deriveFieldState(plan, field.pathPattern, { required: Boolean(issue?.level === "critical") });
                  return (
                    <div key={field.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                          <p className="mt-1 font-mono text-[10px] leading-4 text-slate-400">{field.pathPattern}</p>
                        </div>
                        <FieldStateBadge state={state} />
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-slate-500">Section-level contract only.</p>}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Runtime mode</p>
                  <p className="mt-1 text-xs text-slate-500">Same plan, different action permissions.</p>
                </div>
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {(["test", "live"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRuntimeMode(mode)}
                      className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", runtimeMode === mode ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")}
                    >
                      {formatLabel(mode)}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <RuntimePanel runtime={runtime} loading={runtimeLoading} compiler={runtimeCompiler} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function AssistantResultCard({
  state,
  onApply,
  onDismiss,
}: {
  state: Extract<AssistantState, { status: "result" }>;
  onApply: (proposal: PlanChangeProposal) => void;
  onDismiss: () => void;
}) {
  const result = state.result;
  return (
    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-700" />
          <p className="text-sm font-semibold text-violet-950">Plan Assistant</p>
        </div>
        <Badge tone="purple">{state.provider}</Badge>
      </div>

      {result.type === "answer" ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-slate-700">{result.answer}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.planPaths.map((path) => <Badge key={path} tone="neutral">{path}</Badge>)}
          </div>
        </div>
      ) : null}

      {result.type === "clarification" ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-slate-900">{result.question}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.choices.map((choice) => (
              <button key={choice} className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:border-violet-400">{choice}</button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{result.reason}</p>
        </div>
      ) : null}

      {result.type === "proposal" ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{result.proposal.summary}</p>
            <Badge tone={result.proposal.riskLevel === "high" ? "danger" : result.proposal.riskLevel === "medium" ? "warning" : "success"}>{result.proposal.riskLevel} impact</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {result.proposal.operations.map((operation, index) => (
              <div key={`${operation.path}-${index}`} className="flex items-start gap-2 rounded-xl border border-violet-100 bg-white p-3 text-xs">
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-violet-600" />
                <div className="min-w-0">
                  <span className="font-mono font-semibold text-violet-700">{operation.op}</span>
                  <span className="ml-2 break-all font-mono text-slate-500">{operation.path}</span>
                  {"value" in operation ? <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] text-slate-600">{JSON.stringify(operation.value, null, 2)}</pre> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onApply(result.proposal)}><Save className="size-4" /> Apply to plan</Button>
            <Button size="sm" variant="secondary" onClick={onDismiss}><X className="size-4" /> Cancel</Button>
          </div>
        </div>
      ) : null}

      {result.type !== "proposal" ? (
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
        </div>
      ) : null}
    </div>
  );
}
