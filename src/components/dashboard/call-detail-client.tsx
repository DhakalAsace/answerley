"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageSquareText,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadSbaWorkspace, type StoredTestCall } from "@/lib/sba-client-storage";

export function CallDetailClient() {
  const [call, setCall] = useState<StoredTestCall | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (!cancelled) setCall(workspace.testCall ?? null);
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

  const requestCount = useMemo(() => call?.outcomes.filter((outcome) => outcome.type === "request" || outcome.type === "urgent").length ?? 0, [call]);
  const alertCount = useMemo(() => call?.outcomes.filter((outcome) => outcome.type === "alert").length ?? 0, [call]);
  const primaryOutcome = call?.outcomes[0]?.title ?? "Reviewed";

  if (!call) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/dashboard/calls" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Back to calls</Link>
        <Card className="mt-6 flex min-h-80 items-center justify-center p-6 text-center">
          <div>
            <PhoneCall className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">No call to review yet</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Run a test call first, then return here to review the transcript and actions.</p>
            <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
              Open Test Center <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/dashboard/calls" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Back to calls</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Test call</h1><Badge tone="purple">Test</Badge><Badge tone="success">Completed</Badge></div>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="size-4" /> {new Date(call.startedAt).toLocaleString()}</p>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          Run another test <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-xs font-semibold text-slate-400">Summary</p>
            <p className="mt-2 text-base leading-7 text-slate-700">{call.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Outcome" value={primaryOutcome} icon={<CheckCircle2 className="size-4" />} />
              <Detail label="Transcript" value={`${call.transcript.length} turns`} icon={<Headphones className="size-4" />} />
              <Detail label="Requests" value={String(requestCount)} icon={<CalendarCheck2 className="size-4" />} />
              <Detail label="Owner alerts" value={String(alertCount)} icon={<Bell className="size-4" />} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2"><Headphones className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">Transcript</h2></div>
              <Badge tone="neutral">{call.transcript.length} turns</Badge>
            </div>
            <div className="space-y-4 p-5">
              {call.transcript.map((turn) => (
                <div key={turn.id} className={cn("flex gap-3", turn.speaker === "caller" && "flex-row-reverse")}>
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold", turn.speaker === "caller" ? "bg-[#17152a] text-white" : "bg-violet-50 text-violet-700")}>{turn.speaker === "caller" ? "C" : "A"}</span>
                  <div className={cn("max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6", turn.speaker === "caller" ? "rounded-tr-md bg-slate-100 text-slate-700" : "rounded-tl-md border border-slate-200 bg-white text-slate-700")}>{turn.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2"><CalendarCheck2 className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">Actions</h2></div>
            <div className="mt-4 space-y-3">
              {call.outcomes.map((outcome) => (
                <div key={outcome.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{outcome.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{outcome.detail}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-600">{outcome.status}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><MessageSquareText className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">Related messages</h2></div>
            {call.outcomes.some((outcome) => outcome.type === "alert" || outcome.type === "message") ? (
              <div className="mt-4 space-y-3">
                {call.outcomes.filter((outcome) => outcome.type === "alert" || outcome.type === "message").map((outcome) => (
                  <div key={outcome.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{outcome.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{outcome.detail}</p>
                    <Badge tone="neutral" className="mt-2">{outcome.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">No messages were prepared for this call.</p>
            )}
          </Card>

          <Card className="border-violet-200 bg-violet-50/60 p-5">
            <div className="flex items-center gap-2 text-violet-900"><Sparkles className="size-4" /><h2 className="font-semibold">Improve future calls</h2></div>
            <p className="mt-2 text-sm leading-6 text-violet-700">Use the setup assistant to update how future callers are answered, then rerun this scenario in the Test Center.</p>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400">{icon}{label}</div><p className="mt-2 text-sm font-semibold text-slate-800">{value}</p></div>;
}
