"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageSquareText,
  PhoneForwarded,
  Play,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type StoredTestCall = {
  id: string;
  startedAt: string;
  summary: string;
  transcript: Array<{ id: string; speaker: "caller" | "answerley"; text: string }>;
  outcomes: Array<{ id: string; type: string; title: string; detail: string; status: string }>;
  planRevision: number;
};

const fallbackCall: StoredTestCall = {
  id: "test-call-1",
  startedAt: new Date().toISOString(),
  summary: "Tested business questions, request handling, and message capture.",
  transcript: [
    { id: "t1", speaker: "answerley", text: "Thanks for calling Brightfield Services. How can I help you today?" },
    { id: "t2", speaker: "caller", text: "I would like to make a consultation request." },
    { id: "t3", speaker: "answerley", text: "Absolutely. May I have your name, callback number, and preferred time?" },
  ],
  outcomes: [
    { id: "o1", type: "request", title: "Request captured", detail: "Consultation · Thursday afternoon", status: "Test request" },
    { id: "o2", type: "alert", title: "Owner alert prepared", detail: "New consultation request", status: "Ready after activation" },
  ],
  planRevision: 7,
};

export function CallsFeedClient() {
  const [testCall, setTestCall] = useState<StoredTestCall>(fallbackCall);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("answerley-foundation-test-call");
      if (stored) {
        try { setTestCall(JSON.parse(stored)); } catch { /* use fixture */ }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">Calls</h1>
          <p className="mt-1 text-sm text-slate-500">See what callers needed, what Answerley did, and what happened next.</p>
        </div>
        <Button variant="secondary"><Play className="size-4" /> Place test call</Button>
      </div>

      <Card className="mt-6 overflow-hidden border-violet-200 bg-gradient-to-r from-violet-50 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"><Sparkles className="size-5" /></span>
            <div>
              <p className="font-semibold text-slate-950">Your Answerley assistant is saved and ready to test.</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Connect your phone when you are ready for real calls. The dashboard itself stays the same.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button><PhoneForwarded className="size-4" /> Connect your phone</Button>
            <Link href="/app/answering-plan" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"><BookOpenCheck className="size-4" /> Review Answering Plan</Link>
          </div>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2"><h2 className="font-semibold text-slate-900">Recent calls</h2><Badge tone="neutral">1</Badge></div>
        <span className="text-xs text-slate-400">Test and live calls use the same feed</span>
      </div>

      <Card className="mt-3 overflow-hidden">
        <div className="grid gap-4 border-b border-slate-100 p-5 md:grid-cols-[1.1fr_2fr_1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><TestTube2 className="size-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">Test Call</p><Badge tone="purple">Test</Badge></div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="size-3.5" /> {new Date(testCall.startedAt).toLocaleString()}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Summary</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{testCall.summary}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Action taken</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {testCall.outcomes.slice(0, 2).map((outcome) => <Badge key={outcome.id} tone="info">{outcome.title}</Badge>)}
            </div>
          </div>
          <Link href="/app/calls/test-call" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">View call <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid divide-y divide-slate-100 bg-slate-50/60 text-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <Stat icon={<CheckCircle2 className="size-4" />} label="Outcome" value="Completed" />
          <Stat icon={<CalendarCheck2 className="size-4" />} label="Requests" value={String(testCall.outcomes.filter((item) => item.type === "request").length)} />
          <Stat icon={<MessageSquareText className="size-4" />} label="Messages" value={String(testCall.outcomes.filter((item) => item.type === "message" || item.type === "followup").length)} />
          <Stat icon={<Bell className="size-4" />} label="Owner notified" value="No · test mode" />
        </div>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MiniCard icon={<Headphones className="size-5" />} title="Transcript and audio" text="Every call detail keeps the transcript, audio state, and exact plan version used." />
        <MiniCard icon={<CalendarCheck2 className="size-5" />} title="Related requests" text="Caller requests link back to the call and configured request type." />
        <MiniCard icon={<MessageSquareText className="size-5" />} title="Related messages" text="Prepared, simulated, sent, delivered, and failed states remain distinguishable." />
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="p-4"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-semibold">{label}</span></div><p className="mt-2 font-semibold text-slate-800">{value}</p></div>;
}

function MiniCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <Card className="p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">{icon}</span><h3 className="mt-4 font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></Card>;
}
