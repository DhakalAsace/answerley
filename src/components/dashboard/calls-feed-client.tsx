"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  Clock3,
  Headphones,
  PhoneCall,
  Play,
} from "lucide-react";
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

  const requestCount = useMemo(
    () => testCall?.outcomes.filter((item) => item.type === "request" || item.type === "urgent").length ?? 0,
    [testCall],
  );
  const alertPrepared = Boolean(testCall?.outcomes.some((item) => item.type === "alert"));

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Calls</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Review caller conversations and the follow-up work created from them.
          </p>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white hover:bg-[#292541]">
          <Play className="size-4" /> Run test call
        </Link>
      </div>

      {testCall ? (
        <Card className="mt-6 overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <PhoneCall className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Latest call</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 className="size-3.5" /> {new Date(testCall.startedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-700">{testCall.summary}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <CallFact icon={<Headphones className="size-4" />} label="Transcript" value={`${testCall.transcript.length} turns`} />
                <CallFact icon={<CalendarCheck2 className="size-4" />} label="Requests" value={String(requestCount)} />
                <CallFact icon={<Bell className="size-4" />} label="Owner message" value={alertPrepared ? "Created" : "None"} />
              </div>
            </section>

            <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Work created</h3>
              <div className="mt-3 space-y-3">
                {testCall.outcomes.length ? testCall.outcomes.slice(0, 3).map((outcome) => (
                  <div key={outcome.id}>
                    <p className="text-sm font-semibold text-slate-800">{outcome.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{outcome.detail}</p>
                  </div>
                )) : (
                  <p className="text-sm leading-6 text-slate-500">No follow-up work was created for this call.</p>
                )}
              </div>
              <Link href="/dashboard/calls/test-call" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                Review call <ArrowRight className="size-4" />
              </Link>
            </aside>
          </div>
        </Card>
      ) : (
        <Card className="mt-6 flex min-h-72 items-center justify-center p-6 text-center">
          <div>
            <PhoneCall className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">No calls yet</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Run a test call to review the transcript and captured actions before the business phone is connected.
            </p>
            <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
              Open Test Center <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      )}
    </main>
  );
}

function CallFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{icon}{label}</div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
