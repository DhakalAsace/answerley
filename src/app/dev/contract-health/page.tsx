import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Check,
  CheckCircle2,
  Database,
  FileClock,
  GitBranch,
  HeartPulse,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Waypoints,
} from "lucide-react";
import { FoundationHeader } from "@/components/foundation/foundation-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { capabilityContracts, contractHealthSummary } from "@/domain/answering-plan/capabilities";
import { fieldRegistry, planSections } from "@/domain/answering-plan/field-registry";
import { operationalRelationships } from "@/domain/operations/relationships";
import { formatLabel } from "@/lib/utils";

export default function ContractHealthPage() {
  const summary = contractHealthSummary();
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <FoundationHeader active="/dev/contract-health" />
      <main className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="success">Foundation coverage</Badge>
              <Badge tone="neutral">{summary.total} contracts</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950">Contract Health</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              A visual audit that catches the exact failure mode you were worried about: a setting existing in one place but being forgotten by the dashboard, Plan Assistant, Live runtime, activity records, or tests.
            </p>
          </div>
          <Link href="/dev/answering-plan-lab" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17152a] px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#292541]">
            Open Plan Lab <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric icon={<HeartPulse className="size-5" />} label="Contract status" value={summary.healthy ? "Healthy" : "Needs work"} tone="success" />
          <Metric icon={<Braces className="size-5" />} label="Plan sections" value={String(planSections.length)} tone="purple" />
          <Metric icon={<TableProperties className="size-5" />} label="Registered field rules" value={String(fieldRegistry.length)} tone="info" />
          <Metric icon={<CheckCircle2 className="size-5" />} label="Complete capabilities" value={`${summary.complete}/${summary.total}`} tone="success" />
        </div>

        <Card className="mt-5 overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <Waypoints className="size-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-slate-950">Capability coverage matrix</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Green across a row means the capability has a canonical home and all required consumers are named.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3">Capability</th>
                  <th className="px-4 py-3">Canonical plan</th>
                  <th className="px-4 py-3">Visual UI</th>
                  <th className="px-4 py-3">Plan Assistant</th>
                  <th className="px-4 py-3">Live runtime</th>
                  <th className="px-4 py-3">Activity records</th>
                  <th className="px-4 py-3">Checks</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {capabilityContracts.map((capability) => (
                  <tr key={capability.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{capability.label}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">{capability.id}</p>
                    </td>
                    <HealthCell items={capability.planPaths} />
                    <HealthCell items={capability.uiSurfaces} />
                    <HealthCell items={capability.assistantOperations.length ? capability.assistantOperations.map(formatLabel) : ["Not applicable"]} muted={!capability.assistantOperations.length} />
                    <HealthCell items={capability.runtimeLayers.length ? capability.runtimeLayers.map(formatLabel) : ["Not applicable"]} muted={!capability.runtimeLayers.length} />
                    <HealthCell items={capability.operationalConsumers.length ? capability.operationalConsumers : ["Not applicable"]} muted={!capability.operationalConsumers.length} />
                    <HealthCell items={capability.testIds} />
                    <td className="px-4 py-4">
                      <Badge tone={capability.status === "complete" ? "success" : capability.status === "partial" ? "warning" : "neutral"}>{formatLabel(capability.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Database className="size-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-slate-950">Plan versus operations</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              The plan is the business rulebook. Operations are the receipts of what actually happened. Calls always retain the plan version they used.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-900"><Braces className="size-4" /> Canonical Answering Plan</div>
                <ul className="mt-3 space-y-2 text-sm text-violet-800">
                  <li>Knowledge and approved wording</li>
                  <li>Enabled states and behavior modes</li>
                  <li>Scenarios, routing, intake, fallbacks</li>
                  <li>Greeting, voice, spam, follow-ups</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900"><PhoneCall className="size-4" /> Operational records</div>
                <ul className="mt-3 space-y-2 text-sm text-blue-800">
                  <li>Calls and transcript turns</li>
                  <li>Requests and collected fields</li>
                  <li>Messages, alerts, transfer attempts</li>
                  <li>Numbers, usage, subscriptions</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <GitBranch className="size-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-slate-950">Safe product-change path</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">Every future product decision follows the same impact path instead of relying on a model’s temporary context.</p>
            <div className="mt-5 space-y-3">
              {[
                ["1", "Update the canonical schema and field registry"],
                ["2", "Migrate existing plans or provide defaults"],
                ["3", "Update the visual editor and Plan Assistant operations"],
                ["4", "Update Gemini Live compilation and tool coverage"],
                ["5", "Update operations, fixtures, and tests when affected"],
                ["6", "Contract Health must return to green"],
              ].map(([step, label]) => (
                <div key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#17152a] text-xs font-bold text-white">{step}</span>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <div className="flex items-center gap-2">
            <FileClock className="size-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-950">Operational relationship map</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {operationalRelationships.map((relationship) => (
              <div key={relationship.entity} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  {relationship.entity === "Call" ? <PhoneCall className="size-4 text-violet-600" /> : relationship.entity === "Message" ? <MessageSquareText className="size-4 text-violet-600" /> : <Sparkles className="size-4 text-violet-600" />}
                  <h3 className="text-sm font-semibold text-slate-900">{relationship.entity}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{relationship.purpose}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {relationship.connectsTo.map((item) => <Badge key={item} tone="neutral">{item}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Principle icon={<ShieldCheck className="size-5" />} title="One configuration truth" text="No hidden onboarding plan, dashboard plan, or voice plan." />
          <Principle icon={<FileClock className="size-5" />} title="Immutable history" text="Past calls keep the exact plan snapshot they used." />
          <Principle icon={<Sparkles className="size-5" />} title="AI as a bridge" text="Gemini translates and compiles; validated plan data remains authoritative." />
        </div>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "purple" | "info" }) {
  const background = tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "purple" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700";
  return (
    <Card className="p-5">
      <div className={`flex size-10 items-center justify-center rounded-xl ${background}`}>{icon}</div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function HealthCell({ items, muted = false }: { items: readonly string[]; muted?: boolean }) {
  return (
    <td className="px-4 py-4">
      <div className="flex items-start gap-2">
        {muted ? <span className="mt-0.5 size-4 shrink-0 rounded-full border border-slate-200" /> : <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />}
        <div className="space-y-1">
          {items.slice(0, 3).map((item) => <p key={item} className="text-xs leading-5 text-slate-600">{item}</p>)}
          {items.length > 3 ? <p className="text-xs font-semibold text-slate-400">+{items.length - 3} more</p> : null}
        </div>
      </div>
    </td>
  );
}

function Principle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="p-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">{icon}</div>
      <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </Card>
  );
}
