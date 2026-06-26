"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  Clock3,
  MessageSquareText,
  PhoneCall,
  Play,
  TestTube2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadSbaWorkspace, type StoredTestCall } from "@/lib/sba-client-storage";

export function CallsFeedClient() {
  const [testCall, setTestCall] = useState<StoredTestCall | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (!cancelled) setTestCall(workspace.testCall ?? null);
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

  const requestCount = useMemo(() => testCall?.outcomes.filter((item) => item.type === "request" || item.type === "urgent").length ?? 0, [testCall]);
  const messageCount = useMemo(() => testCall?.outcomes.filter((item) => item.type === "message" || item.type === "followup").length ?? 0, [testCall]);
  const alertPrepared = Boolean(testCall?.outcomes.some((item) => item.type === "alert"));

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Calls</h1>
            <Badge tone="neutral">{testCall ? "1 call" : "No calls"}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">Review caller conversations and the actions created from them.</p>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white hover:bg-[#292541]">
          <Play className="size-4" /> Run test call
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Stat icon={<PhoneCall className="size-4" />} label="Calls" value={testCall ? "1" : "0"} />
        <Stat icon={<CalendarCheck2 className="size-4" />} label="Requests" value={String(requestCount)} />
        <Stat icon={<MessageSquareText className="size-4" />} label="Messages" value={String(messageCount)} />
        <Stat icon={<Bell className="size-4" />} label="Owner alert" value={alertPrepared ? "Prepared" : "None"} />
      </div>

      {testCall ? (
        <Card className="mt-5 overflow-hidden">
          <div className="grid gap-4 p-5 lg:grid-cols-[280px_minmax(0,1fr)_220px_auto] lg:items-center">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"><TestTube2 className="size-5" /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">Test call</p>
                  <Badge tone="purple">Test</Badge>
                  <Badge tone="success">Completed</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="size-3.5" /> {new Date(testCall.startedAt).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{testCall.summary}</p>
              <p className="mt-1 text-xs text-slate-500">{testCall.transcript.length} transcript turns</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {testCall.outcomes.slice(0, 2).map((outcome) => <Badge key={outcome.id} tone="info">{outcome.title}</Badge>)}
            </div>
            <Link href="/dashboard/calls/test-call" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Review call <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="mt-5 flex min-h-72 items-center justify-center p-6 text-center">
          <div>
            <PhoneCall className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">No calls yet</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Run a test call to review the transcript and captured actions before the business phone is connected.</p>
            <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
              Open Test Center <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      )}
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">{icon}</span>
        <span className="text-2xl font-bold text-slate-950">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{label}</p>
    </Card>
  );
}
