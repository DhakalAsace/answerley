"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  Info,
  PhoneCall,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { product } from "@/lib/product";
import {
  calculateAnsweringSetupReadiness,
  demoAnsweringSetup,
  type SetupGateStatus,
} from "@/domain/small-business-answering";
import type { AnsweringSetup } from "@/domain/small-business-answering";
import {
  loadSbaWorkspace,
  type StoredRequest,
  type StoredTestCall,
} from "@/lib/sba-client-storage";

function gateTone(status: SetupGateStatus) {
  if (status === "complete") return "success";
  if (status === "needs_review") return "warning";
  return "danger";
}

function gateLabel(status: SetupGateStatus) {
  if (status === "complete") return "Ready";
  if (status === "needs_review") return "Needs review";
  return "Required";
}

function requestsFromTestCall(testCall: StoredTestCall | null): StoredRequest[] {
  if (!testCall) return [];
  return testCall.outcomes
    .filter((outcome) => ["request", "urgent", "message"].includes(outcome.type))
    .map((outcome) => ({
      id: outcome.id,
      callId: testCall.dbId ?? testCall.id,
      requestType: outcome.type === "urgent" ? "urgent" : outcome.type === "message" ? "message" : "appointment",
      status: "new",
      serviceId: null,
      callerName: null,
      callerPhone: null,
      callerEmail: null,
      preferredTime: /afternoon|morning|monday|tuesday|wednesday|thursday|friday/i.test(outcome.detail) ? outcome.detail : null,
      summary: outcome.title,
      urgency: outcome.type === "urgent" ? "urgent" : "normal",
      testMode: true,
      createdAt: testCall.startedAt,
    }));
}

export default function OverviewPage() {
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const [testCall, setTestCall] = useState<StoredTestCall | null>(null);
  const [requests, setRequests] = useState<StoredRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (cancelled) return;
      if (workspace.setup) setSetup(workspace.setup);
      setTestCall(workspace.testCall ?? null);
      setRequests(workspace.requests ?? []);
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

  const readiness = useMemo(() => calculateAnsweringSetupReadiness(setup), [setup]);
  const displayRequests = useMemo(() => requests.length ? requests : requestsFromTestCall(testCall), [requests, testCall]);
  const setupHealth = readiness.gates.slice(0, 5);
  const readyGateCount = readiness.gates.filter((gate) => gate.status === "complete").length;
  const totalGateCount = readiness.gates.length;
  const readyPercent = totalGateCount ? Math.round((readyGateCount / totalGateCount) * 100) : 0;
  const appointmentRequestCount = displayRequests.filter((request) => request.requestType === "appointment").length;

  return (
    <main className="mx-auto max-w-[1228px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-[30px] font-bold leading-none text-[#0F1115] sm:text-[34px]">Overview</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden size-10 items-center justify-center rounded-full text-[#667085] lg:flex">
            <HelpCircle className="size-5" />
          </span>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#303745] text-xs font-bold text-white">
              {setup.business.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BD"}
            </span>
            <span className="max-w-[190px] truncate text-sm font-medium text-[#111827]">{setup.business.name}</span>
          </div>
          <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[#1565FF] bg-white px-5 text-sm font-semibold text-[#045BFF] shadow-[0_8px_20px_rgba(21,101,255,.06)] hover:bg-[#F4F8FF]">
            Run a test
          </Link>
          <Link href="/dashboard/answering-setup" className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[#D6DAE1] bg-white px-5 text-sm font-semibold text-[#111827] shadow-[0_8px_20px_rgba(15,17,21,.04)] hover:border-[#1565FF] hover:text-[#045BFF]">
            Launch setup
          </Link>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden rounded-[10px] border-[#C6D8FF] bg-white shadow-[0_24px_70px_rgba(21,101,255,.08)]">
        <div className="grid gap-7 p-6 lg:grid-cols-[1fr_336px] lg:p-7">
          <div className="flex gap-8">
            <div className="hidden size-[88px] shrink-0 items-center justify-center rounded-full border border-[#D7E5FF] bg-[#F4F8FF] shadow-[inset_0_0_0_10px_rgba(21,101,255,.04)] sm:flex">
              <span className="flex size-[52px] items-center justify-center rounded-full bg-[#1565FF] text-white shadow-[0_10px_26px_rgba(21,101,255,.26)]">
                <Clock3 className="size-6" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-[#045BFF]">Next step</p>
              <h2 className="mt-2 text-[27px] font-bold leading-tight text-[#0F1115] sm:text-[31px]">
                {readiness.nextGate?.label ?? "Review final approval"}
              </h2>
              <p className="mt-3 max-w-[620px] text-[15px] leading-6 text-[#687386]">
                {readiness.nextGate?.description ?? `Your setup is ready for the business to approve before live callers are connected.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/dashboard/answering-setup" className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#1565FF] px-6 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(21,101,255,.24)] hover:bg-[#045BFF]">
                  Open setup
                </Link>
              </div>
            </div>
          </div>
          <div className="rounded-[10px] border border-[#EFF2F6] bg-white/86 p-5 shadow-[0_20px_60px_rgba(15,17,21,.045)]">
            <Badge tone={readiness.liveReady ? "success" : "info"}>{readiness.liveReady ? "Ready" : product.statusDraft}</Badge>
            <p className="mt-4 text-base font-bold text-[#0F1115]">{readiness.liveReady ? "Ready for approval" : "Not live yet"}</p>
            <p className="mt-2 text-sm leading-6 text-[#596579]">
              {readiness.liveReady ? "Run a final test before phone setup." : "Complete the checklist to launch your answering service."}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E7EEF9]">
              <div className="h-full rounded-full bg-[#1565FF]" style={{ width: `${readyPercent}%` }} />
            </div>
            <p className="mt-3 text-sm font-medium text-[#5F6C7F]">{readyGateCount} of {totalGateCount} steps complete</p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,.82fr)]">
        <Card className="overflow-hidden rounded-[10px] border-[#DFE4EB] bg-white shadow-[0_18px_48px_rgba(15,17,21,.045)]">
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-[#0F1115]">Launch checklist</h2>
              <p className="mt-1 text-sm text-[#687386]">Complete these required steps to go live.</p>
            </div>
            <Badge tone="success">{readyGateCount} of {totalGateCount} complete</Badge>
          </div>
          <div className="divide-y divide-[#EDF1F6] border-y border-[#EDF1F6]">
            {setupHealth.map((gate) => (
              <Link key={gate.id} href="/dashboard/answering-setup" className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-6 py-2 transition hover:bg-[#F8FAFD]">
                <div className="flex min-w-0 items-center gap-4">
                  <span className={gate.status === "complete" ? "text-[#16A34A]" : gate.status === "needs_review" ? "text-[#1565FF]" : "text-[#9AA4B2]"}>
                    {gate.status === "complete" ? <CheckCircle2 className="size-6" /> : <Clock3 className="size-6" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#111827]">{gate.label}</span>
                    <span className="mt-1 block truncate text-xs text-[#667085]">{gate.description}</span>
                  </span>
                </div>
                <Badge tone={gateTone(gate.status)}>{gateLabel(gate.status)}</Badge>
                <ChevronRight className="size-5 text-[#98A2B3]" />
              </Link>
            ))}
          </div>
          <Link href="/dashboard/answering-setup" className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-[#045BFF] hover:text-[#034FCC]">
            View full setup <ArrowRight className="size-4" />
          </Link>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[10px] border-[#DFE4EB] bg-white p-0 shadow-[0_18px_48px_rgba(15,17,21,.045)]">
            <div className="px-5 py-4">
              <h2 className="text-base font-bold text-[#0F1115]">Readiness</h2>
              <p className="mt-1 text-sm text-[#687386]">A quick look at launch dependencies.</p>
            </div>
            <div className="mx-4 mb-4 divide-y divide-[#EDF1F6] overflow-hidden rounded-[10px] border border-[#E6EAF0]">
              <ReadinessRow icon={<PhoneCall className="size-5" />} label="Phone number" note={setup.business.publicPhone ?? "Connect before launch"} tone={readiness.liveReady ? "success" : "neutral"} />
              <ReadinessRow icon={<ShieldCheck className="size-5" />} label="Call routing" note={setup.urgentRouting.enabled ? "Urgent routing configured" : "Review urgent routing"} tone={setup.urgentRouting.enabled ? "success" : "warning"} />
              <ReadinessRow icon={<UserRound className="size-5" />} label="Message delivery" note={setup.ownerAlerts.contacts.length ? "Owner alert contact ready" : "Add owner alert contact"} tone={setup.ownerAlerts.contacts.length ? "success" : "warning"} />
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[10px] border-[#DFE4EB] bg-white p-0 shadow-[0_18px_48px_rgba(15,17,21,.045)]">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 className="text-base font-bold text-[#0F1115]">Latest activity</h2>
              <Link href="/dashboard/calls" className="text-sm font-semibold text-[#045BFF]">View all</Link>
            </div>
          {testCall ? (
            <div className="divide-y divide-[#EDF1F6] border-t border-[#EDF1F6]">
              <ActivityRow
                icon={<PhoneCall className="size-5" />}
                title="Test call completed"
                note={new Date(testCall.startedAt).toLocaleString()}
                href="/dashboard/calls/test-call"
                action="View call"
                tone="success"
              />
              {appointmentRequestCount ? (
                <ActivityRow
                  icon={<CalendarCheck2 className="size-5" />}
                  title="Appointment request captured"
                  note={`${appointmentRequestCount} request${appointmentRequestCount === 1 ? "" : "s"} ready for review`}
                  href="/dashboard/appointments"
                  action="View request"
                  tone="warning"
                />
              ) : null}
            </div>
          ) : (
            <div className="border-t border-[#EDF1F6] p-3">
              <div className="rounded-[10px] border border-dashed border-[#D6DAE1] p-4">
                <p className="text-sm font-semibold text-[#111827]">No call activity yet</p>
                <p className="mt-1 text-sm leading-6 text-[#687386]">Run the first test call to see captured requests and owner alerts here.</p>
                <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#1565FF] px-4 text-sm font-semibold text-white">
                  Open Test Center <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          )}
          </Card>
        </div>
      </div>

      <Card className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[10px] border-[#BFD4FF] bg-[#F7FAFF] px-5 py-2.5 shadow-none lg:pr-44">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full border border-[#BFD4FF] bg-white text-[#045BFF]">
            <Info className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F1115]">You are in control</p>
            <p className="mt-1 text-sm text-[#687386]">Run a test call anytime to hear how we will answer.</p>
          </div>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#1565FF] bg-white px-4 text-sm font-semibold text-[#045BFF] hover:bg-[#F4F8FF]">
          Run a test
        </Link>
      </Card>
    </main>
  );
}

function ReadinessRow({
  icon,
  label,
  note,
  tone,
}: {
  icon: ReactNode;
  label: string;
  note: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 bg-white px-4 py-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-[#EEF4FF] text-[#045BFF]">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#111827]">{label}</span>
        <span className="mt-1 block truncate text-xs text-[#667085]">{note}</span>
      </span>
      <Badge tone={tone === "success" ? "success" : tone === "warning" ? "warning" : "neutral"}>{tone === "success" ? "Ready" : tone === "warning" ? "Review" : "Locked"}</Badge>
    </div>
  );
}

function ActivityRow({
  icon,
  title,
  note,
  href,
  action,
  tone,
}: {
  icon: ReactNode;
  title: string;
  note: string;
  href: string;
  action: string;
  tone: "success" | "warning";
}) {
  return (
    <Link href={href} className="grid grid-cols-[42px_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-4 transition hover:bg-[#F8FAFD]">
      <span className={tone === "success" ? "flex size-10 items-center justify-center rounded-full bg-[#E8F8EF] text-[#16A34A]" : "flex size-10 items-center justify-center rounded-full bg-[#FFF4E4] text-[#A05A00]"}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#111827]">{title}</span>
        <span className="mt-1 block truncate text-xs text-[#667085]">{note}</span>
      </span>
      <span className="hidden text-sm font-semibold text-[#045BFF] sm:inline">{action}</span>
      <ChevronRight className="size-5 text-[#98A2B3]" />
    </Link>
  );
}
