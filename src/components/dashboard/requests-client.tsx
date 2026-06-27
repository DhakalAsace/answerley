"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  Clock3,
  MessageSquareText,
  PhoneCall,
  SquareCheckBig,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { demoAnsweringSetup, labelSbaValue, type AnsweringSetup } from "@/domain/small-business-answering";
import { loadSbaWorkspace, type StoredMessage, type StoredRequest, type StoredRequestStatus, type StoredTestCall } from "@/lib/sba-client-storage";

function statusTone(status: StoredRequestStatus) {
  if (status === "completed" || status === "booked") return "success";
  if (status === "contacted") return "info";
  if (status === "archived") return "neutral";
  return "warning";
}

function typeIcon(type: StoredRequest["requestType"]) {
  if (type === "appointment") return CalendarCheck2;
  if (type === "urgent") return AlertTriangle;
  if (type === "message" || type === "callback") return MessageSquareText;
  return SquareCheckBig;
}

function fallbackRequests(testCall: StoredTestCall | null): StoredRequest[] {
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

export function RequestsClient() {
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const [requests, setRequests] = useState<StoredRequest[]>([]);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [testCall, setTestCall] = useState<StoredTestCall | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (cancelled) return;
      if (workspace.setup) setSetup(workspace.setup);
      setRequests(workspace.requests ?? []);
      setMessages(workspace.messages ?? []);
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

  const displayRequests = useMemo(
    () => requests.length ? requests : fallbackRequests(testCall),
    [requests, testCall],
  );
  const openCount = displayRequests.filter((request) => !["completed", "archived"].includes(request.status)).length;
  const urgentCount = displayRequests.filter((request) => request.urgency === "urgent" || request.requestType === "urgent").length;
  const appointmentCount = displayRequests.filter((request) => request.requestType === "appointment").length;

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Requests</h1>
            <Badge tone="neutral">{setup.business.name}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Follow up on caller needs captured by the answering setup.</p>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
          Test another call <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric icon={<SquareCheckBig className="size-4" />} label="Open requests" value={String(openCount)} />
        <Metric icon={<CalendarCheck2 className="size-4" />} label="Appointments" value={String(appointmentCount)} />
        <Metric icon={<AlertTriangle className="size-4" />} label="Urgent" value={String(urgentCount)} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Request queue</h2>
        </div>
        {displayRequests.length ? (
          <div className="divide-y divide-slate-100">
            {displayRequests.map((request) => {
              const Icon = typeIcon(request.requestType);
              const relatedMessages = messages.filter((message) => message.requestId === request.id || message.callId === request.callId);
              return (
                <div key={request.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1.1fr_.75fr_auto] lg:items-center">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700"><Icon className="size-5" /></span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{labelSbaValue(request.requestType)}</p>
                        {request.testMode ? <Badge tone="purple">Test</Badge> : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="size-3.5" /> {new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Summary</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{request.summary ?? "Caller details captured."}</p>
                    {request.preferredTime ? <p className="mt-1 text-xs font-semibold text-slate-500">Preferred time: {request.preferredTime}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Badge tone={statusTone(request.status)}>{labelSbaValue(request.status)}</Badge>
                    {request.callerName || request.callerPhone ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500"><UserRound className="size-3.5" /> {[request.callerName, request.callerPhone].filter(Boolean).join(" - ")}</p>
                    ) : null}
                    {relatedMessages.length ? <p className="text-xs text-slate-400">{relatedMessages.length} related message{relatedMessages.length === 1 ? "" : "s"}</p> : null}
                  </div>
                  <Link href="/dashboard/calls/test-call" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    View call <ArrowRight className="size-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </Card>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">{icon}</span>
        <span className="text-2xl font-bold text-slate-950">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{label}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-64 items-center justify-center p-6 text-center">
      <div>
        <PhoneCall className="mx-auto size-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">No requests yet</p>
        <p className="mt-1 text-sm text-slate-500">Run a request or appointment scenario to see follow-up work here.</p>
        <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
          Open Test Center <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
