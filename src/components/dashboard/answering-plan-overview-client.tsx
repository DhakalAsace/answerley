"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  MapPin,
  MessageSquareText,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { genericAnsweringPlanFixture } from "@/domain/answering-plan/fixtures";
import { calculatePlanReadiness } from "@/domain/answering-plan/readiness";
import type { AnsweringPlanEnvelope } from "@/domain/answering-plan/schema";

const cards = [
  ["Today’s Update", "Temporary messages and expiry", CalendarClock, "temporaryUpdates"],
  ["What You Offer", "Offerings, behavior, and pricing", Sparkles, "offerings"],
  ["Hours & Availability", "Regular hours and after-hours behavior", Clock3, "hoursAvailability"],
  ["FAQs & Policies", "Approved answers and permitted behavior", BookOpen, "knowledgeItems"],
  ["Locations & Coverage", "Locations, service areas, and remote coverage", MapPin, "locationsCoverage"],
  ["Common Call Scenarios", "Conditions, actions, collection, and fallback", WandSparkles, "scenarios"],
  ["Bookings & Intake", "Request types, custom fields, and booking", CalendarCheck2, "requestsIntake"],
  ["Routing & Escalation", "People, teams, transfers, and unanswered behavior", Route, "routing"],
  ["Follow-up & Messages", "Caller texts, owner alerts, and triggers", MessageSquareText, "followUps"],
  ["Spam Screening", "Robocall and suspected-spam controls", ShieldCheck, "spamScreening"],
  ["Greeting & Voice", "Greeting, assistant, tone, and languages", Volume2, "greetingVoice"],
] as const;

export function AnsweringPlanOverviewClient() {
  const [plan, setPlan] = useState<AnsweringPlanEnvelope>(structuredClone(genericAnsweringPlanFixture));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("answerley-foundation-plan");
      if (stored) {
        try { setPlan(JSON.parse(stored)); } catch { /* fixture */ }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const readiness = useMemo(() => calculatePlanReadiness(plan), [plan]);
  const sectionMap = useMemo(() => new Map(readiness.sections.map((section) => [section.section, section])), [readiness]);
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">Answering Plan</h1><Badge tone="neutral">Revision {plan.revision}</Badge></div>
          <p className="mt-1 text-sm text-slate-500">Review what Answerley knows, says, collects, and does.</p>
        </div>
        <div className="flex gap-2"><Button variant="secondary"><Play className="size-4" /> Test a call</Button><Link href="/dev/answering-plan-lab" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#17152a] px-4 text-sm font-semibold text-white">Open Plan Lab <ArrowRight className="size-4" /></Link></div>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Plan readiness</p>
            <p className="mt-1 text-sm text-slate-500">{readiness.liveReady ? "The current plan has no live-critical gaps." : `${readiness.counts.critical} live-critical item remains. The rest can be improved later.`}</p>
          </div>
          <div className="flex items-center gap-2"><Badge tone={readiness.testReady ? "success" : "danger"}>Test {readiness.testReady ? "ready" : "blocked"}</Badge><Badge tone={readiness.liveReady ? "success" : "warning"}>Live {readiness.liveReady ? "ready" : "needs review"}</Badge></div>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([title, description, Icon, section]) => {
          const state = sectionMap.get(section as never);
          return (
            <Card key={title} className="group p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_16px_40px_rgba(109,93,252,.08)]">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="size-5" /></span>
                <Badge tone={state?.status === "blocked" ? "danger" : state?.status === "needs_review" ? "warning" : "success"}>{state?.status === "blocked" ? "Needs input" : state?.status === "needs_review" ? "Review" : "Ready"}</Badge>
              </div>
              <h2 className="mt-4 font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              <Link href={`/dev/answering-plan-lab`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">Edit <ArrowRight className="size-3.5" /></Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
