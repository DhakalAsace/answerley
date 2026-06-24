"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageSquareText,
  Play,
  Sparkles,
  TestTube2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StoredTestCall = {
  id: string;
  startedAt: string;
  summary: string;
  transcript: Array<{ id: string; speaker: "caller" | "answerley"; text: string }>;
  outcomes: Array<{ id: string; type: string; title: string; detail: string; status: string }>;
  planRevision: number;
};

const fallback: StoredTestCall = {
  id: "test-call-1",
  startedAt: new Date().toISOString(),
  summary: "Tested business questions, request handling, and message capture.",
  planRevision: 7,
  transcript: [
    { id: "1", speaker: "answerley", text: "Thanks for calling Brightfield Services. How can I help you today?" },
    { id: "2", speaker: "caller", text: "I would like to make a consultation request." },
    { id: "3", speaker: "answerley", text: "Absolutely. May I have your name, callback number, and preferred time?" },
    { id: "4", speaker: "caller", text: "My name is Jamie. My number is 204-555-0184, and Thursday afternoon works." },
    { id: "5", speaker: "answerley", text: "Thanks, Jamie. I have your request and preferred time ready for the team." },
  ],
  outcomes: [
    { id: "o1", type: "request", title: "Request captured", detail: "Consultation · Thursday afternoon", status: "Test request" },
    { id: "o2", type: "alert", title: "Owner alert prepared", detail: "New consultation request from Jamie", status: "Ready after activation" },
  ],
};

export function CallDetailClient() {
  const [call, setCall] = useState(fallback);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("answerley-foundation-test-call");
      if (stored) {
        try { setCall(JSON.parse(stored)); } catch { /* fixture */ }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/app/calls" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Back to calls</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">Test Call</h1><Badge tone="purple">Test</Badge><Badge tone="success">Completed</Badge></div>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="size-4" /> {new Date(call.startedAt).toLocaleString()} · Plan revision {call.planRevision}</p>
        </div>
        <Button variant="secondary"><Play className="size-4" /> Play audio</Button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Summary</p>
            <p className="mt-2 text-base leading-7 text-slate-700">{call.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Caller" value="Test Caller" icon={<UserRound className="size-4" />} />
              <Detail label="Mood" value="Neutral" icon={<Sparkles className="size-4" />} />
              <Detail label="Outcome" value="Request captured" icon={<CheckCircle2 className="size-4" />} />
              <Detail label="Owner notified" value="No · test mode" icon={<Bell className="size-4" />} />
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
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", turn.speaker === "caller" ? "bg-[#17152a] text-white" : "bg-violet-50 text-violet-700")}>{turn.speaker === "caller" ? "C" : "A"}</span>
                  <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6", turn.speaker === "caller" ? "rounded-tr-md bg-slate-100 text-slate-700" : "rounded-tl-md border border-slate-200 bg-white text-slate-700")}>{turn.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2"><BookOpenCheck className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">Rule matched</h2></div>
            <p className="mt-3 text-sm font-semibold text-slate-800">Consultation request</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Collect configured details, create a request, and prepare the owner alert.</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Reason: the caller asked to arrange an introductory consultation.</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><CalendarCheck2 className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">Actions</h2></div>
            <div className="mt-4 space-y-3">
              {call.outcomes.map((outcome) => (
                <div key={outcome.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{outcome.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{outcome.detail}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">{outcome.status}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><MessageSquareText className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-900">Related messages</h2></div>
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Owner alert</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">New consultation request from the test caller.</p>
              <Badge tone="neutral" className="mt-2">Prepared</Badge>
            </div>
          </Card>

          <Card className="border-violet-200 bg-violet-50/60 p-5">
            <div className="flex items-center gap-2 text-violet-900"><TestTube2 className="size-4" /><h2 className="font-semibold">Improve from this call</h2></div>
            <p className="mt-2 text-sm leading-6 text-violet-700">Later, the owner can ask the Plan Assistant to change future behavior from this exact call context.</p>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400">{icon}{label}</div><p className="mt-2 text-sm font-semibold text-slate-800">{value}</p></div>;
}
