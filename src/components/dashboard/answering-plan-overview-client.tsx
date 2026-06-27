"use client";

import Link from "next/link";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Ear,
  FileSearch,
  Info,
  MessageSquareText,
  PhoneCall,
  Play,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateAnsweringSetupReadiness,
  demoAnsweringSetup,
  labelSbaValue,
  labelRequestField,
  ownerAlertTemplateFields,
  ownerAlertTemplateOptions,
  requestCaptureFieldOptions,
  renderOwnerAlertTemplatePreview,
  selectedOwnerAlertTemplateId,
  setupSections,
  setupSectionStatus,
  type AnsweringSetup,
  type RequestCaptureField,
  type SetupGateStatus,
  type SetupSectionId,
} from "@/domain/small-business-answering";
import {
  loadSbaWorkspace,
  saveSbaWorkspace,
} from "@/lib/sba-client-storage";
import { cn } from "@/lib/utils";

const iconMap = {
  building: Building2,
  sparkles: Sparkles,
  clock: Clock3,
  "calendar-check": CalendarCheck2,
  "phone-call": PhoneCall,
  volume: Volume2,
  bell: Bell,
  shield: ShieldCheck,
  "file-search": FileSearch,
};

const sectionIconOverride: Partial<Record<SetupSectionId, typeof Clock3>> = {
  appointment_handling: MessageSquareText,
  sources_activation: Settings2,
  safety_unknown: Volume2,
};

const weekdayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const weekendKeys = ["saturday", "sunday"] as const;
const setupHubSectionIds: SetupSectionId[] = [
  "business",
  "services_answers",
  "hours_after_hours",
  "appointment_handling",
  "call_handling",
  "greeting_voice",
  "owner_alerts",
  "safety_unknown",
  "sources_activation",
];

const sectionPresentation: Record<SetupSectionId, { label: string; sublabel: string; description: string }> = {
  business: {
    label: "Business details",
    sublabel: "Business profile",
    description: "Keep the caller-facing name, contact details, timezone, and service area accurate.",
  },
  services_answers: {
    label: "Services & answers",
    sublabel: "What we can say",
    description: "Manage services, approved answers, and safe pricing wording callers may hear.",
  },
  hours_after_hours: {
    label: "Business hours",
    sublabel: "When we answer",
    description: "Tell us when you are open so the answering plan uses the right flow.",
  },
  appointment_handling: {
    label: "Messages & intake",
    sublabel: "What we collect",
    description: "Choose how appointment requests, callbacks, and caller details are captured.",
  },
  call_handling: {
    label: "Call handling",
    sublabel: "When calls answer",
    description: "Control when calls are answered, how long the phone rings, and urgent routing.",
  },
  greeting_voice: {
    label: "Greeting & voice",
    sublabel: "Caller greeting",
    description: "Set the greeting, language, recording disclosure, and pronunciation notes.",
  },
  owner_alerts: {
    label: "Owner alerts",
    sublabel: "Needs review",
    description: "Choose who receives messages, urgent alerts, and owner summaries.",
  },
  safety_unknown: {
    label: "Safety & fallback",
    sublabel: "Unknown questions",
    description: "Set safe fallback behavior for unknown questions, spam, privacy, and recording.",
  },
  sources_activation: {
    label: "Sources & launch",
    sublabel: "Final review",
    description: "Review supporting sources, owner edits, and launch requirements before calls go live.",
  },
};

const timeOptions = [
  { value: "07:00", label: "7:00 AM" },
  { value: "07:30", label: "7:30 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
] as const;

type DayKey = keyof AnsweringSetup["hours"]["regular"];
type SetupSection = (typeof setupSections)[number];

function gateTone(status: SetupGateStatus | "complete") {
  if (status === "complete") return "success";
  if (status === "needs_review") return "warning";
  return "danger";
}

function gateLabel(status: SetupGateStatus | "complete") {
  if (status === "complete") return "Ready";
  if (status === "needs_review") return "Needs review";
  return "Required";
}

function listFromText(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function sectionLabel(id: SetupSectionId) {
  return sectionPresentation[id]?.label ?? setupSections.find((section) => section.id === id)?.label ?? "Setup section";
}

function sectionDescription(id: SetupSectionId) {
  return sectionPresentation[id]?.description ?? setupSections.find((section) => section.id === id)?.description ?? "";
}

function firstPeriod(setup: AnsweringSetup, day: DayKey) {
  return setup.hours.regular[day].periods[0] ?? { opensAt: "08:00", closesAt: "18:00" };
}

function weekendMode(setup: AnsweringSetup) {
  if (weekendKeys.every((day) => !setup.hours.regular[day].open)) return "closed";
  const weekday = firstPeriod(setup, "monday");
  if (weekendKeys.every((day) => {
    const period = firstPeriod(setup, day);
    return setup.hours.regular[day].open && period.opensAt === weekday.opensAt && period.closesAt === weekday.closesAt;
  })) return "same_as_weekdays";
  return "short_weekend";
}

function setupSectionIcon(section: SetupSection) {
  return sectionIconOverride[section.id] ?? iconMap[section.icon as keyof typeof iconMap] ?? FileSearch;
}

function setupSectionGlyph(section: SetupSection, className: string) {
  return createElement(setupSectionIcon(section), { className });
}

function formatTimeLabel(value: string) {
  return timeOptions.find((option) => option.value === value)?.label ?? value;
}

function sectionFacts(setup: AnsweringSetup, id: SetupSectionId) {
  switch (id) {
    case "business":
      return [setup.business.name, setup.business.timezone];
    case "services_answers":
      return [
        `${setup.services.filter((service) => service.enabled).length} active services`,
        `${setup.approvedAnswers.length} approved answers`,
      ];
    case "hours_after_hours": {
      const weekday = firstPeriod(setup, "monday");
      return [
        `${formatTimeLabel(weekday.opensAt)} - ${formatTimeLabel(weekday.closesAt)} weekdays`,
        setup.hours.afterHours.enabled ? "After-hours answer on" : "After-hours answer off",
      ];
    }
    case "appointment_handling":
      return [labelSbaValue(setup.appointmentHandling.mode), `${setup.requestCapture.fields.length} details captured`];
    case "call_handling":
      return [labelSbaValue(setup.callHandling.mode), `${setup.callHandling.answerTiming.ringDelaySeconds}s ring delay`];
    case "greeting_voice":
      return [setup.business.primaryLanguage.toUpperCase(), labelSbaValue(setup.privacy.callRecording)];
    case "owner_alerts":
      return [
        `${setup.ownerAlerts.contacts.filter((contact) => contact.enabled).length} active contacts`,
        setup.ownerAlerts.channels.length ? setup.ownerAlerts.channels.map(labelSbaValue).join(" + ") : "No delivery method",
      ];
    case "safety_unknown":
      return [labelSbaValue(setup.callHandling.unknownAnswerBehavior), setup.spamScreening.enabled ? "Spam screening on" : "Spam screening off"];
    case "sources_activation":
      return [
        `${setup.sources.length} sources`,
        `${setup.activationGates.filter((gate) => gate.status !== "complete").length} items to review`,
      ];
  }
}

function sectionHasCallerPreview(id: SetupSectionId) {
  return id === "hours_after_hours" || id === "appointment_handling" || id === "call_handling" || id === "greeting_voice";
}

function SetupHub({
  onSelectSection,
  readiness,
  setup,
}: {
  onSelectSection: (id: SetupSectionId) => void;
  readiness: ReturnType<typeof calculateAnsweringSetupReadiness>;
  setup: AnsweringSetup;
}) {
  const sectionStates = setupHubSectionIds
    .map((id) => setupSections.find((section) => section.id === id))
    .filter((section): section is SetupSection => Boolean(section))
    .map((section) => ({ section, status: setupSectionStatus(setup, section) }));
  const requiredSections = sectionStates.filter((item) => item.status === "blocked");
  const reviewSections = sectionStates.filter((item) => item.status === "needs_review");
  const readySections = sectionStates.filter((item) => item.status === "complete");
  const nextSection = requiredSections[0] ?? reviewSections[0] ?? null;
  const progressPercent = Math.round((readySections.length / sectionStates.length) * 100);

  return (
    <section className="mt-8 space-y-7">
      <Card className="overflow-hidden border-slate-200 bg-white p-0 shadow-[0_18px_48px_rgba(15,23,42,.06)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_1.15fr]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Launch readiness</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{readiness.statusLabel}</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-slate-950">{readySections.length}/{sectionStates.length}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">setup areas ready</p>
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#0757f8]" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <ReadinessMetric label="Required" value={requiredSections.length} tone="danger" />
              <ReadinessMetric label="Needs review" value={reviewSections.length} tone="warning" />
              <ReadinessMetric label="Ready" value={readySections.length} tone="success" />
            </div>
          </div>

          {nextSection ? (
            <NextSetupPanel
              setup={setup}
              section={nextSection.section}
              status={nextSection.status}
              onSelect={() => onSelectSection(nextSection.section.id)}
            />
          ) : (
            <div className="flex min-h-[260px] items-center p-6">
              <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
                    <CheckCircle2 className="size-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">All setup areas are ready</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">Run a final test before going live.</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">The dashboard, assistant, and test calls are using this same saved setup.</p>
                    <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#0757f8] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(7,87,248,.22)] hover:bg-[#0048d9]">
                      Run test <ChevronRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Setup areas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Open one area at a time. Each detail screen edits the same answering setup used by tests and future calls.
            </p>
          </div>
          <Link href="/dashboard/test-center" className="text-sm font-semibold text-[#0757f8] hover:text-[#0048d9]">
            Run test
          </Link>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <SetupSectionGroup
            title="Required before launch"
            description="Finish these first so callers can be handled safely."
            emptyText="No required setup left."
            items={requiredSections}
            setup={setup}
            onSelectSection={onSelectSection}
          />
          <SetupSectionGroup
            title="Needs review"
            description="These are usable for testing but should be checked."
            emptyText="Nothing needs review right now."
            items={reviewSections}
            setup={setup}
            onSelectSection={onSelectSection}
          />
        </div>

        <SetupSectionGroup
          compact
          title="Ready settings"
          description="These areas are ready and can still be edited anytime."
          emptyText="Ready settings will appear here as setup is completed."
          items={readySections}
          setup={setup}
          onSelectSection={onSelectSection}
        />
      </div>
    </section>
  );
}

function ReadinessMetric({ label, tone, value }: { label: string; tone: "danger" | "success" | "warning"; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2">
        <StatusDot tone={tone} />
        <span className="text-lg font-semibold text-slate-950">{value}</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function StatusDot({ tone }: { tone: "danger" | "neutral" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "size-2.5 rounded-full",
        tone === "danger" && "bg-red-500",
        tone === "neutral" && "bg-slate-400",
        tone === "success" && "bg-emerald-500",
        tone === "warning" && "bg-amber-500",
      )}
    />
  );
}

function statusDotTone(status: SetupGateStatus | "complete"): "danger" | "neutral" | "success" | "warning" {
  if (status === "complete") return "success";
  if (status === "needs_review") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

function NextSetupPanel({
  onSelect,
  section,
  setup,
  status,
}: {
  onSelect: () => void;
  section: SetupSection;
  setup: AnsweringSetup;
  status: SetupGateStatus | "complete";
}) {
  const action = status === "blocked" ? `Set ${sectionLabel(section.id).toLowerCase()}` : `Review ${sectionLabel(section.id).toLowerCase()}`;

  return (
    <div className="p-6">
      <p className="text-sm font-semibold text-slate-500">{status === "blocked" ? "Next required step" : "Next best review"}</p>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "mt-4 flex w-full items-start gap-5 rounded-lg border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,.08)]",
          status === "blocked" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60",
        )}
      >
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg bg-white", status === "blocked" ? "text-red-600" : "text-amber-600")}>
          {setupSectionGlyph(section, "size-6")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-slate-950">{sectionLabel(section.id)}</span>
            <Badge tone={gateTone(status)}>{gateLabel(status)}</Badge>
          </span>
          <span className="mt-2 block max-w-2xl text-sm leading-6 text-slate-700">{sectionDescription(section.id)}</span>
          <span className="mt-4 flex flex-wrap gap-2">
            {sectionFacts(setup, section.id).map((fact) => (
              <span key={fact} className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                {fact}
              </span>
            ))}
          </span>
          <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#0757f8] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(7,87,248,.2)]">
            {action} <ChevronRight className="size-4" />
          </span>
        </span>
      </button>
    </div>
  );
}

function SetupSectionGroup({
  compact = false,
  description,
  emptyText,
  items,
  onSelectSection,
  setup,
  title,
}: {
  compact?: boolean;
  description: string;
  emptyText: string;
  items: Array<{ section: SetupSection; status: SetupGateStatus | "complete" }>;
  onSelectSection: (id: SetupSectionId) => void;
  setup: AnsweringSetup;
  title: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,.04)]", compact && "mt-5")}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <Badge tone={items.length ? "neutral" : "success"}>{items.length}</Badge>
        </div>
      </div>

      {items.length ? (
        <div className={cn("divide-y divide-slate-100", compact && "grid divide-y-0 md:grid-cols-2 xl:grid-cols-3")}>
          {items.map(({ section, status }) => (
            <SetupSectionRow
              key={section.id}
              compact={compact}
              section={section}
              setup={setup}
              status={status}
              onSelect={() => onSelectSection(section.id)}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-6 text-sm font-medium text-slate-500">{emptyText}</div>
      )}
    </section>
  );
}

function SetupSectionRow({
  compact = false,
  onSelect,
  section,
  setup,
  status,
}: {
  compact?: boolean;
  onSelect: () => void;
  section: SetupSection;
  setup: AnsweringSetup;
  status: SetupGateStatus | "complete";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50",
        compact && "border-b border-r border-slate-100 last:border-b-0",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0757f8]">
        {setupSectionGlyph(section, "size-5")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-950">{sectionLabel(section.id)}</span>
          <StatusDot tone={statusDotTone(status)} />
          <span className="text-xs font-semibold text-slate-500">{gateLabel(status)}</span>
        </span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">{compact ? sectionFacts(setup, section.id).join(" · ") : sectionDescription(section.id)}</span>
        {!compact ? (
          <span className="mt-3 flex flex-wrap gap-2">
            {sectionFacts(setup, section.id).map((fact) => (
              <span key={fact} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                {fact}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition group-hover:border-[#0757f8] group-hover:text-[#0757f8]">
        <ChevronRight className="size-4" />
      </span>
    </button>
  );
}

function SetupSectionDetail({
  onBack,
  section,
  setup,
  status,
  updateDraft,
}: {
  onBack: () => void;
  section: SetupSection;
  setup: AnsweringSetup;
  status: SetupGateStatus | "complete";
  updateDraft: (mutator: (draft: AnsweringSetup) => void) => void;
}) {
  const showCallerPreview = sectionHasCallerPreview(section.id);
  const editorHasOwnPadding = section.id === "hours_after_hours" || section.id === "owner_alerts";

  return (
    <section className="mt-10 space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <ChevronRight className="size-4 rotate-180" /> Setup areas
      </button>

      <div className={cn("grid gap-5", showCallerPreview && "2xl:grid-cols-[minmax(0,1fr)_397px]")}>
        <Card className="overflow-hidden border-slate-200 bg-white p-0">
          <div className="border-b border-slate-100 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{sectionLabel(section.id)}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{sectionDescription(section.id)}</p>
              </div>
              <Badge tone={gateTone(status)}>{gateLabel(status)}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {sectionFacts(setup, section.id).map((fact) => (
                <span key={fact} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                  {fact}
                </span>
              ))}
            </div>
          </div>
          <div className={cn(!editorHasOwnPadding && "p-6")}>
            <SectionEditor sectionId={section.id} setup={setup} updateDraft={updateDraft} />
          </div>
        </Card>

        {showCallerPreview ? <CallerImpactPreview setup={setup} className="2xl:sticky 2xl:top-5" /> : null}
      </div>
    </section>
  );
}

export function AnsweringPlanOverviewClient() {
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const setupRef = useRef<AnsweringSetup>(demoAnsweringSetup);
  const hasUnsavedChangesRef = useRef(false);
  const [selectedSectionId, setSelectedSectionId] = useState<SetupSectionId | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (cancelled) return;
      if (workspace.setup && !hasUnsavedChangesRef.current) {
        setupRef.current = workspace.setup;
        setSetup(workspace.setup);
      }
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
  const selectedSection = selectedSectionId
    ? setupSections.find((section) => section.id === selectedSectionId) ?? null
    : null;

  function updateDraft(mutator: (draft: AnsweringSetup) => void) {
    const draft = structuredClone(setupRef.current);
    mutator(draft);
    setupRef.current = draft;
    setSetup(draft);
    hasUnsavedChangesRef.current = true;
    setHasUnsavedChanges(true);
    setSaveState("idle");
  }

  async function saveSetup() {
    setSaveState("saving");
    const nextSetup = structuredClone(setupRef.current);
    nextSetup.status.draftRevision += 1;
    nextSetup.status.needsReview = true;
    nextSetup.status.mode = nextSetup.status.isLive ? nextSetup.status.mode : "draft";
    const saved = await saveSbaWorkspace({ setup: nextSetup });
    const savedSetup = saved.setup ?? nextSetup;
    setupRef.current = savedSetup;
    setSetup(savedSetup);
    hasUnsavedChangesRef.current = false;
    setHasUnsavedChanges(false);
    setSaveState("saved");
  }

  return (
    <main className="mx-auto max-w-[1264px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[31px] font-semibold leading-tight text-slate-950">Answering Setup</h1>
            <Badge
              tone={readiness.liveReady ? "success" : "warning"}
              className={cn(
                "border-0 px-3 py-1.5 text-sm",
                readiness.liveReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {readiness.liveReady ? "Ready" : "Draft"}
            </Badge>
            {hasUnsavedChanges ? <Badge tone="warning">Unsaved changes</Badge> : saveState === "saved" ? <Badge tone="success">Saved</Badge> : null}
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-slate-600">
            <CheckCircle2 className="size-4 text-emerald-600" />
            You are editing your answering plan. Save changes when this section looks right.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50">
            <PhoneCall className="size-4" /> Test setup
          </Link>
          <Button
            onClick={saveSetup}
            disabled={saveState === "saving"}
            className="min-w-[160px] bg-[#0757f8] px-6 shadow-[0_10px_24px_rgba(7,87,248,.24)] hover:bg-[#0048d9]"
          >
            <Save className="size-4" /> {saveState === "saving" ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {selectedSection ? (
        <SetupSectionDetail
          section={selectedSection}
          setup={setup}
          status={setupSectionStatus(setup, selectedSection)}
          onBack={() => setSelectedSectionId(null)}
          updateDraft={updateDraft}
        />
      ) : (
        <SetupHub readiness={readiness} setup={setup} onSelectSection={setSelectedSectionId} />
      )}
    </main>
  );
}

function BusinessHoursEditor({
  setup,
  updateDraft,
}: {
  setup: AnsweringSetup;
  updateDraft: (mutator: (draft: AnsweringSetup) => void) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const weekdayPeriod = firstPeriod(setup, "monday");
  const selectedWeekendMode = weekendMode(setup);

  function updateWeekdayHours(field: "opensAt" | "closesAt", value: string) {
    updateDraft((draft) => {
      weekdayKeys.forEach((day) => {
        const current = draft.hours.regular[day].periods[0] ?? weekdayPeriod;
        draft.hours.regular[day].open = true;
        draft.hours.regular[day].periods = [{
          opensAt: field === "opensAt" ? value : current.opensAt,
          closesAt: field === "closesAt" ? value : current.closesAt,
        }];
      });
    });
  }

  function updateWeekendMode(value: string) {
    updateDraft((draft) => {
      weekendKeys.forEach((day) => {
        if (value === "closed") {
          draft.hours.regular[day].open = false;
          draft.hours.regular[day].periods = [];
          return;
        }

        const period = value === "same_as_weekdays"
          ? firstPeriod(draft, "monday")
          : { opensAt: "09:00", closesAt: "13:00" };
        draft.hours.regular[day].open = true;
        draft.hours.regular[day].periods = [period];
      });
    });
  }

  return (
    <div className="divide-y divide-slate-100">
      <div className="grid gap-4 px-6 py-6 md:grid-cols-[154px_minmax(0,1fr)] md:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-950">Weekday hours</p>
          <p className="mt-1 text-sm text-slate-600">Mon - Fri</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_44px] items-center gap-3">
          <Select
            value={weekdayPeriod.opensAt}
            onChange={(event) => updateWeekdayHours("opensAt", event.target.value)}
            className="rounded-lg border-slate-300"
          >
            {timeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <span className="text-sm text-slate-400">-</span>
          <Select
            value={weekdayPeriod.closesAt}
            onChange={(event) => updateWeekdayHours("closesAt", event.target.value)}
            className="rounded-lg border-slate-300"
          >
            {timeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <button
            type="button"
            aria-label="Edit detailed weekday hours"
            className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50"
          >
            <Clock3 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-[154px_minmax(0,1fr)] md:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-950">Weekend hours</p>
          <p className="mt-1 text-sm text-slate-600">Sat - Sun</p>
        </div>
        <div>
          <Select
            value={selectedWeekendMode}
            onChange={(event) => updateWeekendMode(event.target.value)}
            className="rounded-lg border-slate-300"
          >
            <option value="closed">Closed</option>
            <option value="short_weekend">9:00 AM - 1:00 PM</option>
            <option value="same_as_weekdays">Same as weekdays</option>
          </Select>
          <p className="mt-2 text-xs leading-5 text-slate-500">We will use your after-hours answer whenever you are closed.</p>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-[154px_minmax(0,1fr)] md:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-950">After-hours answer</p>
          <p className="mt-1 text-sm text-slate-600">Outside business hours</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleSwitch
            checked={setup.hours.afterHours.enabled}
            label="Use after-hours answer"
            onChange={(checked) => updateDraft((draft) => { draft.hours.afterHours.enabled = checked; })}
          />
          <span className="text-sm font-medium text-slate-700">Use after-hours answer</span>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-[154px_minmax(0,1fr)] md:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-950">Urgent rule</p>
          <p className="mt-1 text-sm text-slate-600">When to alert you</p>
        </div>
        <div>
          <Select
            value={setup.urgentRouting.enabled ? "if_urgent" : "off"}
            onChange={(event) => updateDraft((draft) => {
              draft.urgentRouting.enabled = event.target.value === "if_urgent";
              draft.hours.afterHours.mode = event.target.value === "if_urgent" ? "urgent_only" : "take_message";
            })}
            className="rounded-lg border-slate-300"
          >
            <option value="if_urgent">If the caller says it is urgent</option>
            <option value="off">Do not use urgent alerts after hours</option>
          </Select>
          <p className="mt-2 text-xs leading-5 text-slate-500">We will ask a few questions to confirm urgency.</p>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-[154px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-slate-950">After-hours wording</p>
          <p className="mt-1 text-sm text-slate-600">What callers hear</p>
        </div>
        <Textarea
          value={setup.hours.afterHours.callerWording ?? ""}
          onChange={(event) => updateDraft((draft) => { draft.hours.afterHours.callerWording = event.target.value || null; })}
          className="min-h-[96px] rounded-lg border-slate-300"
        />
      </div>

      <div className="px-6 py-5">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center gap-4 rounded-lg border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
            <Settings2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-950">Advanced rules</span>
            <span className="mt-1 block text-xs text-slate-500">Customize more conditions and responses</span>
          </span>
          <ChevronRight className={cn("size-5 text-slate-600 transition", advancedOpen && "rotate-90")} />
        </button>

        {advancedOpen ? (
          <div className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <EditorField label="After-hours mode">
              <Select value={setup.hours.afterHours.mode} onChange={(event) => updateDraft((draft) => { draft.hours.afterHours.mode = event.target.value as AnsweringSetup["hours"]["afterHours"]["mode"]; })}>
                <option value="take_message">Take message</option>
                <option value="urgent_only">Urgent only</option>
                <option value="send_booking_link">Send booking link</option>
                <option value="closed_message">Closed message</option>
              </Select>
            </EditorField>
            <EditorField label="Timezone">
              <Input value={setup.hours.timezone} onChange={(event) => updateDraft((draft) => { draft.hours.timezone = event.target.value; draft.business.timezone = event.target.value; })} />
            </EditorField>
            <EditorField label="Urgent wording" className="md:col-span-2">
              <Textarea value={setup.hours.afterHours.urgentWording ?? ""} onChange={(event) => updateDraft((draft) => { draft.hours.afterHours.urgentWording = event.target.value || null; })} />
            </EditorField>
            <EditorField label="Temporary update" className="md:col-span-2">
              <Textarea
                value={setup.hours.temporaryUpdate?.message ?? ""}
                placeholder="Example: We are closed this Friday for a team training day."
                onChange={(event) => updateDraft((draft) => {
                  draft.hours.temporaryUpdate = event.target.value
                    ? {
                        title: draft.hours.temporaryUpdate?.title ?? "Temporary hours update",
                        message: event.target.value,
                        expiresAt: draft.hours.temporaryUpdate?.expiresAt ?? null,
                      }
                    : null;
                })}
              />
            </EditorField>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CallerImpactPreview({ className, setup }: { className?: string; setup: AnsweringSetup }) {
  const businessName = setup.business.name || "your business";
  const greetingText = setup.callHandling.callerGreeting;
  const greetingAlreadyOffersHelp = /\bhelp\b/i.test(greetingText);
  const afterHoursText = setup.hours.afterHours.callerWording
    || `Thanks for calling ${businessName}. We are currently closed. How can we help you?`;
  const urgentText = setup.hours.afterHours.urgentWording
    || "I am sorry to hear that. Let me get a few details so I can alert the owner right away.";
  const urgentFields: RequestCaptureField[] = setup.urgentRouting.collectFields.length
    ? setup.urgentRouting.collectFields
    : ["caller_name", "phone", "reason"];

  return (
    <Card className={cn("overflow-hidden border-slate-200 bg-white p-0 2xl:sticky 2xl:top-5", className)}>
      <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-6">
        <Ear className="size-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-950">What callers hear</h2>
      </div>
      <div className="space-y-6 px-6 py-6">
        <section>
          <PreviewPill tone="green">During business hours</PreviewPill>
          <p className="mt-4 text-sm leading-7 text-slate-700">{greetingText}</p>
          {greetingAlreadyOffersHelp ? null : <p className="mt-1 text-sm leading-7 text-slate-700">How can we help you?</p>}
        </section>

        <div className="h-px bg-slate-100" />

        <section>
          <PreviewPill tone="blue">After business hours</PreviewPill>
          <div className="mt-4 flex gap-4">
            <button
              type="button"
              aria-label="Preview after-hours answer"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[#0757f8] shadow-sm transition hover:bg-blue-50"
            >
              <Play className="ml-0.5 size-4 fill-current" />
            </button>
            <p className="text-sm leading-7 text-slate-700">{afterHoursText}</p>
          </div>
        </section>

        <div className="h-px bg-slate-100" />

        <section>
          <PreviewPill tone="orange">If the caller says it is urgent</PreviewPill>
          <p className="mt-4 text-sm leading-7 text-slate-700">{urgentText}</p>
          <ul className="mt-4 space-y-2">
            {urgentFields.slice(0, 3).map((field) => (
              <li key={field} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {labelRequestField(field)}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-7 text-slate-700">We will get this to the owner immediately.</p>
        </section>

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-[#0757f8]" />
            <p className="text-xs leading-5 text-slate-600">
              This preview reflects your current settings. Test calls will use the same flow.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PreviewPill({ children, tone }: { children: React.ReactNode; tone: "green" | "blue" | "orange" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-4 py-2 text-sm font-medium",
        tone === "green" && "bg-emerald-50 text-emerald-800",
        tone === "blue" && "bg-blue-50 text-[#0757f8]",
        tone === "orange" && "bg-orange-50 text-orange-700",
      )}
    >
      {children}
    </span>
  );
}

function ToggleSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-6 w-11 items-center rounded-full p-0.5 transition",
        checked ? "bg-[#0757f8]" : "bg-slate-300",
      )}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-sm transition", checked && "translate-x-5")} />
    </button>
  );
}

function SectionEditor({
  sectionId,
  setup,
  updateDraft,
}: {
  sectionId: SetupSectionId;
  setup: AnsweringSetup;
  updateDraft: (mutator: (draft: AnsweringSetup) => void) => void;
}) {
  if (sectionId === "business") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <EditorField label="Business name"><Input value={setup.business.name} onChange={(event) => updateDraft((draft) => { draft.business.name = event.target.value; })} /></EditorField>
        <EditorField label="Website"><Input type="url" value={setup.business.websiteUrl ?? ""} onChange={(event) => updateDraft((draft) => { draft.business.websiteUrl = event.target.value.trim() || null; })} /></EditorField>
        <EditorField label="Public phone"><Input value={setup.business.publicPhone ?? ""} onChange={(event) => updateDraft((draft) => { draft.business.publicPhone = event.target.value || null; })} /></EditorField>
        <EditorField label="Public email"><Input type="email" value={setup.business.publicEmail ?? ""} onChange={(event) => updateDraft((draft) => { draft.business.publicEmail = event.target.value.trim() || null; })} /></EditorField>
        <EditorField label="Timezone"><Input value={setup.business.timezone} onChange={(event) => updateDraft((draft) => { draft.business.timezone = event.target.value; draft.hours.timezone = event.target.value; })} /></EditorField>
        <EditorField label="Primary language"><Input value={setup.business.primaryLanguage} onChange={(event) => updateDraft((draft) => { draft.business.primaryLanguage = event.target.value || "en"; })} /></EditorField>
        <EditorField label="Service area" className="md:col-span-2"><Textarea value={setup.business.serviceArea.summary ?? ""} onChange={(event) => updateDraft((draft) => { draft.business.serviceArea.summary = event.target.value || null; })} /></EditorField>
        <EditorField label="Areas served" className="md:col-span-2"><Input value={setup.business.serviceArea.areas.join(", ")} onChange={(event) => updateDraft((draft) => { draft.business.serviceArea.areas = listFromText(event.target.value); })} /></EditorField>
      </div>
    );
  }

  if (sectionId === "services_answers") {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Services</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => updateDraft((draft) => {
                draft.services.push({
                  id: `service_${Date.now()}`,
                  enabled: true,
                  name: "New service",
                  approvedDescription: null,
                  aliases: [],
                  canAnswerQuestions: true,
                  canCaptureRequest: true,
                  appointmentEligible: false,
                  pricingWording: null,
                });
              })}
            >
              <Plus className="size-4" /> Add service
            </Button>
          </div>
          {setup.services.map((service, index) => (
            <div key={service.id} className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <EditorField label="Service name"><Input value={service.name} onChange={(event) => updateDraft((draft) => { draft.services[index].name = event.target.value; })} /></EditorField>
                <EditorField label="Pricing wording"><Input value={service.pricingWording ?? ""} onChange={(event) => updateDraft((draft) => { draft.services[index].pricingWording = event.target.value || null; })} /></EditorField>
                <EditorField label="Approved description" className="md:col-span-2"><Textarea value={service.approvedDescription ?? ""} onChange={(event) => updateDraft((draft) => { draft.services[index].approvedDescription = event.target.value || null; })} /></EditorField>
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                <Checkbox label="Enabled" checked={service.enabled} onChange={(checked) => updateDraft((draft) => { draft.services[index].enabled = checked; })} />
                <Checkbox label="Can answer questions" checked={service.canAnswerQuestions} onChange={(checked) => updateDraft((draft) => { draft.services[index].canAnswerQuestions = checked; })} />
                <Checkbox label="Can capture request" checked={service.canCaptureRequest} onChange={(checked) => updateDraft((draft) => { draft.services[index].canCaptureRequest = checked; })} />
                <Checkbox label="Appointment eligible" checked={service.appointmentEligible} onChange={(checked) => updateDraft((draft) => { draft.services[index].appointmentEligible = checked; })} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Approved answers</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => updateDraft((draft) => {
                draft.approvedAnswers.push({
                  id: `answer_${Date.now()}`,
                  question: "New question",
                  answer: "Approved answer",
                  sourceIds: [],
                  needsReview: true,
                });
              })}
            >
              <Plus className="size-4" /> Add answer
            </Button>
          </div>
          {setup.approvedAnswers.map((answer, index) => (
            <div key={answer.id} className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-4">
                <EditorField label="Caller question"><Input value={answer.question} onChange={(event) => updateDraft((draft) => { draft.approvedAnswers[index].question = event.target.value; })} /></EditorField>
                <EditorField label="Approved answer"><Textarea value={answer.answer} onChange={(event) => updateDraft((draft) => { draft.approvedAnswers[index].answer = event.target.value; })} /></EditorField>
                <Checkbox label="Needs owner review" checked={answer.needsReview} onChange={(checked) => updateDraft((draft) => { draft.approvedAnswers[index].needsReview = checked; })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sectionId === "hours_after_hours") {
    return <BusinessHoursEditor setup={setup} updateDraft={updateDraft} />;
  }

  if (sectionId === "appointment_handling") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <EditorField label="Appointment mode">
          <Select value={setup.appointmentHandling.mode} onChange={(event) => updateDraft((draft) => { draft.appointmentHandling.mode = event.target.value as AnsweringSetup["appointmentHandling"]["mode"]; })}>
            <option value="capture_request">Capture request</option>
            <option value="send_booking_link">Send booking link</option>
            <option value="calendar_booking">Calendar booking</option>
          </Select>
        </EditorField>
        <EditorField label="Calendar status">
          <Select value={setup.appointmentHandling.calendarIntegration} onChange={(event) => updateDraft((draft) => { draft.appointmentHandling.calendarIntegration = event.target.value as AnsweringSetup["appointmentHandling"]["calendarIntegration"]; })}>
            <option value="none">Not connected</option>
            <option value="connected">Connected</option>
          </Select>
        </EditorField>
        <EditorField label="Booking link"><Input type="url" value={setup.appointmentHandling.bookingLinkUrl ?? ""} onChange={(event) => updateDraft((draft) => { draft.appointmentHandling.bookingLinkUrl = event.target.value.trim() || null; })} /></EditorField>
        <Checkbox label="Do not confirm booked appointments until owner approval" checked={setup.appointmentHandling.doNotCallBookedUntilConfirmed} onChange={(checked) => updateDraft((draft) => { draft.appointmentHandling.doNotCallBookedUntilConfirmed = checked; })} />
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-slate-700">Caller details to capture</p>
          <RequestFieldsSelector
            value={setup.requestCapture.fields}
            onChange={(fields) => updateDraft((draft) => { draft.requestCapture.fields = fields; })}
          />
        </div>
        <EditorField label="Caller summary wording" className="md:col-span-2"><Textarea value={setup.requestCapture.callerSummaryWording} onChange={(event) => updateDraft((draft) => { draft.requestCapture.callerSummaryWording = event.target.value; })} /></EditorField>
        <Checkbox label="Send caller confirmation when relevant" checked={setup.callerConfirmations.sendBookingLinkWhenRelevant} onChange={(checked) => updateDraft((draft) => { draft.callerConfirmations.sendBookingLinkWhenRelevant = checked; })} />
      </div>
    );
  }

  if (sectionId === "call_handling") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <EditorField label="Answer mode">
          <Select value={setup.callHandling.mode} onChange={(event) => updateDraft((draft) => { draft.callHandling.mode = event.target.value as AnsweringSetup["callHandling"]["mode"]; })}>
            <option value="owner_first">Owner first</option>
            <option value="overflow">Overflow</option>
            <option value="after_hours">After hours</option>
            <option value="immediate">Immediate</option>
            <option value="urgent_only">Urgent only</option>
            <option value="paused">Paused</option>
          </Select>
        </EditorField>
        <EditorField label="Ring delay seconds"><Input type="number" min={0} max={120} value={setup.callHandling.answerTiming.ringDelaySeconds} onChange={(event) => updateDraft((draft) => { draft.callHandling.answerTiming.ringDelaySeconds = Number(event.target.value); })} /></EditorField>
        <Checkbox label="Answer when closed" checked={setup.callHandling.answerTiming.answerWhenClosed} onChange={(checked) => updateDraft((draft) => { draft.callHandling.answerTiming.answerWhenClosed = checked; })} />
        <Checkbox label="Answer when busy" checked={setup.callHandling.answerTiming.answerWhenBusy} onChange={(checked) => updateDraft((draft) => { draft.callHandling.answerTiming.answerWhenBusy = checked; })} />
        <Checkbox label="Urgent routing enabled" checked={setup.urgentRouting.enabled} onChange={(checked) => updateDraft((draft) => { draft.urgentRouting.enabled = checked; })} />
        <Checkbox label="Spam screening enabled" checked={setup.spamScreening.enabled} onChange={(checked) => updateDraft((draft) => { draft.spamScreening.enabled = checked; })} />
        <EditorField label="Urgent phrases" className="md:col-span-2"><Input value={setup.urgentRouting.detectionPhrases.join(", ")} onChange={(event) => updateDraft((draft) => { draft.urgentRouting.detectionPhrases = listFromText(event.target.value); })} /></EditorField>
        <EditorField label="Spam screening wording" className="md:col-span-2"><Textarea value={setup.spamScreening.callerWording} onChange={(event) => updateDraft((draft) => { draft.spamScreening.callerWording = event.target.value; })} /></EditorField>
      </div>
    );
  }

  if (sectionId === "greeting_voice") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <EditorField label="Caller greeting" className="md:col-span-2"><Textarea value={setup.callHandling.callerGreeting} onChange={(event) => updateDraft((draft) => { draft.callHandling.callerGreeting = event.target.value; })} /></EditorField>
        <EditorField label="Primary language"><Input value={setup.business.primaryLanguage} onChange={(event) => updateDraft((draft) => { draft.business.primaryLanguage = event.target.value || "en"; })} /></EditorField>
        <EditorField label="Pronunciation"><Input value={setup.business.pronunciation ?? ""} onChange={(event) => updateDraft((draft) => { draft.business.pronunciation = event.target.value || null; })} /></EditorField>
        <EditorField label="Call recording">
          <Select value={setup.privacy.callRecording} onChange={(event) => updateDraft((draft) => { draft.privacy.callRecording = event.target.value as AnsweringSetup["privacy"]["callRecording"]; })}>
            <option value="off">Off</option>
            <option value="on_with_disclosure">On with disclosure</option>
          </Select>
        </EditorField>
        <EditorField label="Retention days"><Input type="number" min={1} value={setup.privacy.retentionDays} onChange={(event) => updateDraft((draft) => { draft.privacy.retentionDays = Number(event.target.value); })} /></EditorField>
        <EditorField label="Caller disclosure" className="md:col-span-2"><Textarea value={setup.privacy.callerDisclosure} onChange={(event) => updateDraft((draft) => { draft.privacy.callerDisclosure = event.target.value; })} /></EditorField>
      </div>
    );
  }

  if (sectionId === "owner_alerts") {
    return <OwnerAlertsEditor setup={setup} updateDraft={updateDraft} />;
  }

  if (sectionId === "safety_unknown") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <EditorField label="Unknown-question behavior">
          <Select value={setup.callHandling.unknownAnswerBehavior} onChange={(event) => updateDraft((draft) => { draft.callHandling.unknownAnswerBehavior = event.target.value as AnsweringSetup["callHandling"]["unknownAnswerBehavior"]; })}>
            <option value="take_message_and_flag">Take message and flag</option>
            <option value="say_not_sure_and_offer_message">Say not sure and offer message</option>
            <option value="route_to_owner">Route to owner</option>
          </Select>
        </EditorField>
        <Checkbox label="Keep screened spam separate from normal calls" checked={setup.spamScreening.keepOutOfBillableUsage} onChange={(checked) => updateDraft((draft) => { draft.spamScreening.keepOutOfBillableUsage = checked; })} />
        <Checkbox label="Spam screening enabled" checked={setup.spamScreening.enabled} onChange={(checked) => updateDraft((draft) => { draft.spamScreening.enabled = checked; })} />
        <EditorField label="Call recording">
          <Select value={setup.privacy.callRecording} onChange={(event) => updateDraft((draft) => { draft.privacy.callRecording = event.target.value as AnsweringSetup["privacy"]["callRecording"]; })}>
            <option value="off">Off</option>
            <option value="on_with_disclosure">On with disclosure</option>
          </Select>
        </EditorField>
        <EditorField label="Spam screening wording" className="md:col-span-2"><Textarea value={setup.spamScreening.callerWording} onChange={(event) => updateDraft((draft) => { draft.spamScreening.callerWording = event.target.value; })} /></EditorField>
        <EditorField label="Caller disclosure" className="md:col-span-2"><Textarea value={setup.privacy.callerDisclosure} onChange={(event) => updateDraft((draft) => { draft.privacy.callerDisclosure = event.target.value; })} /></EditorField>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">Sources</h3>
        <div className="mt-3 space-y-3">
          {setup.sources.length ? setup.sources.map((source) => (
            <div key={source.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{source.label}</p>
                <Badge tone="neutral">{labelSbaValue(source.type)}</Badge>
              </div>
              {source.excerpt ? <p className="mt-2 text-sm leading-6 text-slate-500">{source.excerpt}</p> : null}
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">No sources have been saved yet.</div>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">Launch requirements</h3>
        <div className="mt-3 space-y-2">
          {setup.activationGates.map((gate) => (
            <div key={gate.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <span className="text-sm font-semibold text-slate-800">{gate.label}</span>
              <Badge tone={gateTone(gate.status)}>{gateLabel(gate.status)}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OwnerAlertsEditor({
  setup,
  updateDraft,
}: {
  setup: AnsweringSetup;
  updateDraft: (mutator: (draft: AnsweringSetup) => void) => void;
}) {
  const emailContacts = setup.ownerAlerts.contacts.filter((contact) => contact.enabled && contact.email).length;
  const smsContacts = setup.ownerAlerts.contacts.filter((contact) => contact.enabled && contact.sms).length;
  const selectedTemplateId = selectedOwnerAlertTemplateId(setup.ownerAlerts.messageTemplate);
  const templateFields = ownerAlertTemplateFields(setup.ownerAlerts.messageTemplate);

  function setChannel(channel: AnsweringSetup["ownerAlerts"]["channels"][number], enabled: boolean) {
    updateDraft((draft) => {
      draft.ownerAlerts.channels = enabled
        ? Array.from(new Set([...draft.ownerAlerts.channels, channel]))
        : draft.ownerAlerts.channels.filter((item) => item !== channel);
    });
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Alert contacts</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">People who can receive call summaries and urgent alerts.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => updateDraft((draft) => {
              draft.ownerAlerts.contacts.push({
                id: `contact_${Date.now()}`,
                role: "owner",
                name: "New contact",
                sms: null,
                email: null,
                enabled: true,
              });
            })}
          >
            <Plus className="size-4" /> Add contact
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {setup.ownerAlerts.contacts.map((contact, index) => (
            <div key={contact.id} className={cn("rounded-lg border p-4", contact.enabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50")}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{contact.name || "New contact"}</p>
                  <p className="mt-1 text-xs text-slate-500">{labelSbaValue(contact.role)}</p>
                </div>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-semibold text-slate-600">Receives alerts</span>
                  <ToggleSwitch
                    checked={contact.enabled}
                    label={`${contact.name || "Contact"} receives alerts`}
                    onChange={(checked) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].enabled = checked; })}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <EditorField label="Name">
                  <Input value={contact.name} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].name = event.target.value; })} />
                </EditorField>
                <EditorField label="Role">
                  <Select value={contact.role} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].role = event.target.value as AnsweringSetup["ownerAlerts"]["contacts"][number]["role"]; })}>
                    <option value="owner">Owner</option>
                    <option value="office">Office</option>
                    <option value="on_call">On call</option>
                    <option value="backup">Backup</option>
                  </Select>
                </EditorField>
                <EditorField label="Text message number">
                  <Input value={contact.sms ?? ""} placeholder="+1 555 0100" onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].sms = event.target.value || null; })} />
                </EditorField>
                <EditorField label="Email address">
                  <Input type="email" value={contact.email ?? ""} placeholder="owner@example.com" onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].email = event.target.value.trim() || null; })} />
                </EditorField>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Delivery methods</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Choose where prepared summaries should be sent.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ChannelChoice
            active={setup.ownerAlerts.channels.includes("email")}
            title="Email alerts"
            description="Send call summaries to contacts with an email address."
            detail={`${emailContacts} active email contact${emailContacts === 1 ? "" : "s"}`}
            onChange={(checked) => setChannel("email", checked)}
          />
          <ChannelChoice
            active={setup.ownerAlerts.channels.includes("sms")}
            title="Text message alerts"
            description="Send short urgent and request summaries by text."
            detail={smsContacts ? `${smsContacts} active text contact${smsContacts === 1 ? "" : "s"}` : "Add a text number above to use this"}
            onChange={(checked) => setChannel("sms", checked)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Owner alert message</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">This is an example of the summary you will receive after a caller leaves details.</p>
          </div>
          {selectedTemplateId === "custom" ? <Badge tone="warning">Custom wording</Badge> : null}
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-blue-700">Example alert</p>
          <p className="mt-2 text-sm leading-6 text-slate-800">{renderOwnerAlertTemplatePreview(setup.ownerAlerts.messageTemplate)}</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {ownerAlertTemplateOptions.map((option) => {
            const active = selectedTemplateId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => updateDraft((draft) => { draft.ownerAlerts.messageTemplate = option.template; })}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  active ? "border-[#0757f8] bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <span className="block text-sm font-semibold text-slate-950">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
              </button>
            );
          })}
        </div>

        {templateFields.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {templateFields.map((field) => (
              <span key={field} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {labelRequestField(field)}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ChannelChoice({
  active,
  description,
  detail,
  onChange,
  title,
}: {
  active: boolean;
  description: string;
  detail: string;
  onChange: (checked: boolean) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(!active)}
      className={cn(
        "flex min-h-[104px] gap-3 rounded-lg border p-4 text-left transition",
        active ? "border-[#0757f8] bg-white shadow-sm" : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border", active ? "border-[#0757f8] bg-[#0757f8] text-white" : "border-slate-300 text-transparent")}>
        <CheckCircle2 className="size-3.5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
        <span className="mt-2 block text-xs font-semibold text-slate-600">{detail}</span>
      </span>
    </button>
  );
}

function RequestFieldsSelector({
  value,
  onChange,
}: {
  value: RequestCaptureField[];
  onChange: (fields: RequestCaptureField[]) => void;
}) {
  const selected = new Set(value);

  function toggleField(field: RequestCaptureField) {
    const next = new Set(selected);
    if (next.has(field)) {
      next.delete(field);
    } else {
      next.add(field);
    }
    onChange(requestCaptureFieldOptions.map((option) => option.id).filter((fieldId) => next.has(fieldId)));
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {requestCaptureFieldOptions.map((option) => {
        const active = selected.has(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggleField(option.id)}
            className={cn(
              "flex min-h-[72px] items-start gap-3 rounded-lg border p-3 text-left transition",
              active ? "border-[#0757f8] bg-blue-50 text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", active ? "border-[#0757f8] bg-[#0757f8] text-white" : "border-slate-300 text-transparent")}>
              <CheckCircle2 className="size-3.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EditorField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-slate-300 text-[#17152a] focus:ring-[#17152a]"
      />
      {label}
    </label>
  );
}
