"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PhoneCall,
  ShieldCheck,
  TestTube2,
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
  const metrics = [
    {
      label: "Calls answered",
      value: testCall ? "1" : "0",
      note: testCall ? "Latest test saved" : "Connect phone to start live calls",
      icon: PhoneCall,
    },
    {
      label: "Requests captured",
      value: String(displayRequests.length),
      note: displayRequests.length ? "Ready for follow-up" : "No requests yet",
      icon: ClipboardList,
    },
    {
      label: "Appointment requests",
      value: String(displayRequests.filter((request) => request.requestType === "appointment").length),
      note: "From call handling",
      icon: CalendarCheck2,
    },
    {
      label: "Urgent calls",
      value: String(displayRequests.filter((request) => request.requestType === "urgent" || request.urgency === "urgent").length),
      note: setup.urgentRouting.enabled ? "Urgent routing is configured" : "Urgent routing is off",
      icon: AlertTriangle,
    },
    {
      label: "Spam screened",
      value: "0",
      note: setup.spamScreening.enabled ? "Screening is ready" : "Screening is off",
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Overview</h1>
            <Badge tone={readiness.liveReady ? "success" : "warning"}>{readiness.liveReady ? "Ready for final approval" : product.statusDraft}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">See what is ready, what needs attention, and what happened in the latest test call.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/answering-setup" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#292541]">
            Review setup <ArrowRight className="size-4" />
          </Link>
          <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            <TestTube2 className="size-4" /> Test a call
          </Link>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden border-slate-200">
        <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_.85fr] lg:p-6">
          <div>
            <Badge tone="info">Next step</Badge>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">Finish {readiness.nextGate?.label.toLowerCase() ?? "final approval"}.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {readiness.nextGate?.description ?? `The setup is ready for the business to approve.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dashboard/answering-setup" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
                Review setup
              </Link>
              <Link href="/dashboard/test-center" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Run a test
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-900">
              <Clock3 className="size-4" />
              <p className="text-sm font-semibold">Not live yet</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-800">Test calls are safe. No live caller messages are sent until final approval and phone setup are complete.</p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Icon className="size-4" /></span>
                <span className="text-2xl font-bold text-slate-950">{metric.value}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{metric.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{metric.note}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Launch checklist</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {setupHealth.map((gate) => (
              <div key={gate.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className={gate.status === "complete" ? "text-emerald-600" : "text-slate-300"}><CheckCircle2 className="size-5" /></span>
                  <span className="text-sm font-medium text-slate-800">{gate.label}</span>
                </div>
                <Badge tone={gateTone(gate.status)}>{gateLabel(gate.status)}</Badge>
              </div>
            ))}
          </div>
          <Link href="/dashboard/answering-setup" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950">
            Review full setup <ArrowRight className="size-4" />
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Latest activity</h2>
          {testCall ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Test call completed</p>
                <Badge tone="purple">Test</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{testCall.summary}</p>
              <Link href="/dashboard/calls/test-call" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                View call <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">No call activity yet</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Run the first test call to see captured requests and owner alerts here.</p>
              <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-3 text-sm font-semibold text-white">
                Open Test Center <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
