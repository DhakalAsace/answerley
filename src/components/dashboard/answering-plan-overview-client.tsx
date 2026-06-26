"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileSearch,
  PhoneCall,
  Plus,
  Save,
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
  fieldsForSetupSection,
  setupSections,
  setupSectionStatus,
  summarizeSetupCounts,
  type AnsweringSetup,
  type SetupFieldDefinition,
  type SetupGateStatus,
  type SetupSectionId,
} from "@/domain/small-business-answering";
import { product } from "@/lib/product";
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

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

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

function formatMode(value: string) {
  return value.replaceAll("_", " ");
}

function listFromText(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function fieldsSummary(fields: SetupFieldDefinition[]) {
  const labels = fields.filter((field) => field.userCanEdit).slice(0, 3).map((field) => field.label);
  if (!labels.length) return "Review supporting information and launch requirements.";
  return `Includes ${labels.join(", ")}${fields.length > labels.length ? ", and more" : ""}.`;
}

export function AnsweringPlanOverviewClient() {
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const setupRef = useRef<AnsweringSetup>(demoAnsweringSetup);
  const hasUnsavedChangesRef = useRef(false);
  const [selectedSectionId, setSelectedSectionId] = useState<SetupSectionId>("business");
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
  const counts = useMemo(() => summarizeSetupCounts(setup), [setup]);
  const selectedSection = setupSections.find((section) => section.id === selectedSectionId) ?? setupSections[0];
  const selectedStatus = setupSectionStatus(setup, selectedSection);
  const selectedFields = fieldsForSetupSection(selectedSection.id).filter((field) => field.userCanEdit);
  const sectionProgress = setupSections.map((section) => ({
    section,
    status: setupSectionStatus(setup, section),
    fields: fieldsForSetupSection(section.id),
  }));
  const readySectionCount = sectionProgress.filter((item) => item.status === "complete").length;
  const nextSectionId = readiness.nextGate
    ? setupSections.find((section) => section.gateIds.includes(readiness.nextGate?.id ?? ""))?.id ?? selectedSectionId
    : selectedSectionId;

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
    <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Answering Setup</h1>
            <Badge tone={readiness.liveReady ? "success" : "warning"}>{readiness.liveReady ? "Ready for final approval" : product.statusDraft}</Badge>
            {hasUnsavedChanges ? <Badge tone="warning">Unsaved changes</Badge> : saveState === "saved" ? <Badge tone="success">Saved</Badge> : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Control what callers hear, what gets collected, and who receives alerts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveSetup} disabled={!hasUnsavedChanges || saveState === "saving"}>
            <Save className="size-4" /> {saveState === "saving" ? "Saving..." : "Save changes"}
          </Button>
          <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Test setup <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_auto] lg:items-stretch">
          <div className="p-5">
            <Badge tone={readiness.liveReady ? "success" : "info"}>{readiness.liveReady ? "Ready" : "Next setup step"}</Badge>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {readiness.nextGate ? readiness.nextGate.label : "Review the final setup"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {readiness.nextGate?.description ?? `Real callers reach ${product.name} only after the business approves the setup.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSectionId(nextSectionId)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-3 text-sm font-semibold text-white hover:bg-[#292541]"
              >
                Open section <ArrowRight className="size-4" />
              </button>
              <Link href="/dashboard/test-center" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Run a test
              </Link>
            </div>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 border-t border-slate-100 bg-slate-50 lg:border-l lg:border-t-0">
            <SummaryStat label="Ready" value={`${readySectionCount}/${setupSections.length}`} />
            <SummaryStat label="Services" value={String(counts.services)} />
            <SummaryStat label="Alerts" value={String(counts.ownerAlertContacts)} />
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="p-3 lg:sticky lg:top-5 lg:self-start">
          <div className="px-2 pb-2 pt-1">
            <h2 className="font-semibold text-slate-950">Setup sections</h2>
            <p className="mt-1 text-sm text-slate-500">Pick one area. Edit it on the right.</p>
          </div>
          <div className="max-h-[68vh] space-y-1 overflow-auto pr-1">
            {sectionProgress.map(({ section, status, fields }) => {
              const Icon = iconMap[section.icon as keyof typeof iconMap] ?? FileSearch;
              const selected = selectedSectionId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition",
                    selected ? "border-[#17152a] bg-slate-950 text-white" : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", selected ? "bg-white/12 text-white" : "bg-slate-100 text-slate-600")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{section.label}</span>
                      <span className={cn("mt-0.5 block text-xs", selected ? "text-white/65" : "text-slate-400")}>{fields.filter((field) => field.userCanEdit).length} editable fields</span>
                    </span>
                    <span className={cn("size-2 rounded-full", status === "complete" ? "bg-emerald-500" : status === "needs_review" ? "bg-amber-500" : "bg-red-500")} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{selectedSection.label}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{selectedSection.description}</p>
                </div>
                <Badge tone={gateTone(selectedStatus)}>{gateLabel(selectedStatus)}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFields.slice(0, 4).map((field) => (
                  <span key={field.id} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">{field.label}</span>
                ))}
                {selectedFields.length > 4 ? <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">+{selectedFields.length - 4} more</span> : null}
              </div>
            </div>
            <div className="p-5">
              <SectionEditor sectionId={selectedSection.id} setup={setup} updateDraft={updateDraft} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
              <p className="text-sm text-slate-500">{hasUnsavedChanges ? "Save when this section looks right." : fieldsSummary(selectedFields)}</p>
              <Button onClick={saveSetup} disabled={!hasUnsavedChanges || saveState === "saving"} size="sm">
                <Save className="size-4" /> {saveState === "saving" ? "Saving..." : "Save"}
              </Button>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-950">Launch checklist</h2>
                <Badge tone={readiness.liveReady ? "success" : "warning"}>{readiness.counts.complete} ready</Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {setup.activationGates.map((gate) => (
                  <button
                    key={gate.id}
                    type="button"
                    onClick={() => {
                      const section = setupSections.find((item) => item.gateIds.includes(gate.id));
                      if (section) setSelectedSectionId(section.id);
                    }}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <CheckCircle2 className={cn("size-4 shrink-0", gate.status === "complete" ? "text-emerald-600" : "text-slate-300")} />
                      <span className="truncate text-sm font-semibold text-slate-800">{gate.label}</span>
                    </span>
                    <Badge tone={gateTone(gate.status)}>{gateLabel(gate.status)}</Badge>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold text-slate-950">Caller behavior</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Fact label="Answer mode" value={formatMode(setup.callHandling.mode)} />
                <Fact label="After hours" value={formatMode(setup.hours.afterHours.mode)} />
                <Fact label="Appointments" value={formatMode(setup.appointmentHandling.mode)} />
                <Fact label="Spam screening" value={setup.spamScreening.enabled ? "On" : "Off"} />
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-400">Greeting</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{setup.callHandling.callerGreeting}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
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
    return (
      <div className="space-y-5">
        <div className="grid gap-3">
          {weekdays.map((day) => {
            const dayHours = setup.hours.regular[day];
            const period = dayHours.periods[0] ?? { opensAt: "09:00", closesAt: "17:00" };
            return (
              <div key={day} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[.8fr_1fr_1fr] md:items-center">
                <Checkbox
                  label={`${day[0].toUpperCase()}${day.slice(1)} open`}
                  checked={dayHours.open}
                  onChange={(checked) => updateDraft((draft) => {
                    draft.hours.regular[day].open = checked;
                    draft.hours.regular[day].periods = checked ? [draft.hours.regular[day].periods[0] ?? { opensAt: "09:00", closesAt: "17:00" }] : [];
                  })}
                />
                <Input type="time" value={period.opensAt} disabled={!dayHours.open} onChange={(event) => updateDraft((draft) => { draft.hours.regular[day].periods[0] = { ...period, opensAt: event.target.value }; })} />
                <Input type="time" value={period.closesAt} disabled={!dayHours.open} onChange={(event) => updateDraft((draft) => { draft.hours.regular[day].periods[0] = { ...period, closesAt: event.target.value }; })} />
              </div>
            );
          })}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EditorField label="After-hours mode">
            <Select value={setup.hours.afterHours.mode} onChange={(event) => updateDraft((draft) => { draft.hours.afterHours.mode = event.target.value as AnsweringSetup["hours"]["afterHours"]["mode"]; })}>
              <option value="take_message">Take message</option>
              <option value="urgent_only">Urgent only</option>
              <option value="send_booking_link">Send booking link</option>
              <option value="closed_message">Closed message</option>
            </Select>
          </EditorField>
          <Checkbox label="Answer after hours" checked={setup.hours.afterHours.enabled} onChange={(checked) => updateDraft((draft) => { draft.hours.afterHours.enabled = checked; })} />
          <EditorField label="After-hours wording" className="md:col-span-2"><Textarea value={setup.hours.afterHours.callerWording ?? ""} onChange={(event) => updateDraft((draft) => { draft.hours.afterHours.callerWording = event.target.value || null; })} /></EditorField>
          <EditorField label="Urgent wording" className="md:col-span-2"><Textarea value={setup.hours.afterHours.urgentWording ?? ""} onChange={(event) => updateDraft((draft) => { draft.hours.afterHours.urgentWording = event.target.value || null; })} /></EditorField>
        </div>
      </div>
    );
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
        <EditorField label="Fields to collect" className="md:col-span-2"><Input value={setup.requestCapture.fields.join(", ")} onChange={(event) => updateDraft((draft) => { draft.requestCapture.fields = listFromText(event.target.value) as AnsweringSetup["requestCapture"]["fields"]; })} /></EditorField>
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
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950">Alert contacts</h3>
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
        {setup.ownerAlerts.contacts.map((contact, index) => (
          <div key={contact.id} className="rounded-lg border border-slate-200 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <EditorField label="Name"><Input value={contact.name} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].name = event.target.value; })} /></EditorField>
              <EditorField label="Role">
                <Select value={contact.role} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].role = event.target.value as AnsweringSetup["ownerAlerts"]["contacts"][number]["role"]; })}>
                  <option value="owner">Owner</option>
                  <option value="office">Office</option>
                  <option value="on_call">On call</option>
                  <option value="backup">Backup</option>
                </Select>
              </EditorField>
              <EditorField label="SMS"><Input value={contact.sms ?? ""} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].sms = event.target.value || null; })} /></EditorField>
              <EditorField label="Email"><Input type="email" value={contact.email ?? ""} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].email = event.target.value.trim() || null; })} /></EditorField>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Checkbox label="Enabled" checked={contact.enabled} onChange={(checked) => updateDraft((draft) => { draft.ownerAlerts.contacts[index].enabled = checked; })} />
            </div>
          </div>
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          <Checkbox label="Send email alerts" checked={setup.ownerAlerts.channels.includes("email")} onChange={(checked) => updateDraft((draft) => { draft.ownerAlerts.channels = checked ? Array.from(new Set([...draft.ownerAlerts.channels, "email"])) : draft.ownerAlerts.channels.filter((channel) => channel !== "email"); })} />
          <Checkbox label="Send SMS alerts" checked={setup.ownerAlerts.channels.includes("sms")} onChange={(checked) => updateDraft((draft) => { draft.ownerAlerts.channels = checked ? Array.from(new Set([...draft.ownerAlerts.channels, "sms"])) : draft.ownerAlerts.channels.filter((channel) => channel !== "sms"); })} />
          <EditorField label="Owner alert wording" className="md:col-span-2"><Textarea value={setup.ownerAlerts.messageTemplate} onChange={(event) => updateDraft((draft) => { draft.ownerAlerts.messageTemplate = event.target.value; })} /></EditorField>
        </div>
      </div>
    );
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
                <Badge tone="neutral">{formatMode(source.type)}</Badge>
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-slate-200 px-4 py-5 last:border-r-0">
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize text-slate-800">{value}</p>
    </div>
  );
}
