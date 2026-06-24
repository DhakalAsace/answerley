"use client";

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Link2,
  MapPin,
  MessageSquareText,
  PhoneForwarded,
  Plus,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import type { PlanSectionId } from "@/domain/answering-plan/field-registry";
import type { AnsweringPlanEnvelope } from "@/domain/answering-plan/schema";
import { cn, formatLabel } from "@/lib/utils";

export type CommitPlanValue = (
  path: string,
  value: unknown,
  summary: string,
  risk?: "low" | "medium" | "high",
) => void;

function SectionHeading({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-4 last:border-0">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {badge ? <Badge tone="neutral">{badge}</Badge> : null}
        </div>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function ItemCard({
  title,
  subtitle,
  enabled,
  onEnabledChange,
  children,
  badge,
}: {
  title: string;
  subtitle?: string | null;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card className={cn("p-5 transition", !enabled && "bg-slate-50/70 opacity-75")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {badge ? <Badge tone="neutral">{badge}</Badge> : null}
          </div>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        <Toggle checked={enabled} onChange={onEnabledChange} label={`${title} enabled`} />
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function PlanSectionEditor({
  section,
  plan,
  commit,
}: {
  section: PlanSectionId;
  plan: AnsweringPlanEnvelope;
  commit: CommitPlanValue;
}) {
  const doc = plan.document;

  if (section === "businessProfile") {
    return (
      <div>
        <SectionHeading
          icon={<UserRound className="size-5" />}
          title="Business Profile"
          description="The approved identity and basic information Answerley uses in greetings and answers."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business name">
            <Input
              value={doc.businessProfile.businessName ?? ""}
              onChange={(event) => commit("/businessProfile/businessName", event.target.value, "Update business name")}
            />
          </Field>
          <Field label="Business type" hint="Useful for defaults, never a rigid vertical lock.">
            <Input
              value={doc.businessProfile.businessType.label ?? ""}
              onChange={(event) => commit("/businessProfile/businessType/label", event.target.value, "Update business type")}
            />
          </Field>
          <Field label="Website">
            <Input
              type="url"
              value={doc.businessProfile.websiteUrl ?? ""}
              onChange={(event) => commit("/businessProfile/websiteUrl", event.target.value || null, "Update website")}
            />
          </Field>
          <Field label="Timezone" hint="Used by hours, temporary updates, routing, and message windows.">
            <Input
              value={doc.businessProfile.timezone ?? ""}
              onChange={(event) => commit("/businessProfile/timezone", event.target.value || null, "Update timezone")}
            />
          </Field>
          <Field label="Public phone">
            <Input
              value={doc.businessProfile.publicContact.phone ?? ""}
              onChange={(event) => commit("/businessProfile/publicContact/phone", event.target.value || null, "Update public phone")}
            />
          </Field>
          <Field label="Public email">
            <Input
              type="email"
              value={doc.businessProfile.publicContact.email ?? ""}
              onChange={(event) => commit("/businessProfile/publicContact/email", event.target.value || null, "Update public email")}
            />
          </Field>
          <Field label="Business description" className="md:col-span-2">
            <Textarea
              value={doc.businessProfile.description ?? ""}
              onChange={(event) => commit("/businessProfile/description", event.target.value || null, "Update business description")}
            />
          </Field>
        </div>
      </div>
    );
  }

  if (section === "temporaryUpdates") {
    return (
      <div>
        <SectionHeading
          icon={<CalendarDays className="size-5" />}
          title="Today’s Update"
          description="Temporary information that can be enabled, scheduled, and removed without changing permanent business knowledge."
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              commit(
                "/temporaryUpdates/-",
                {
                  id: `update_${Date.now()}`,
                  enabled: true,
                  title: "New update",
                  message: "Add a temporary message.",
                  mentionWhen: "when_relevant",
                  startsAt: null,
                  expiresAt: null,
                  removeAutomatically: true,
                },
                "Add temporary update",
              )
            }
          >
            <Plus className="size-4" /> Add update
          </Button>
        </SectionHeading>
        <div className="space-y-4">
          {doc.temporaryUpdates.length ? (
            doc.temporaryUpdates.map((update, index) => (
              <ItemCard
                key={update.id}
                title={update.title}
                subtitle="A time-limited instruction for the call agent."
                enabled={update.enabled}
                onEnabledChange={(next) => commit(`/temporaryUpdates/${index}/enabled`, next, `${next ? "Enable" : "Disable"} temporary update`)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Title">
                    <Input value={update.title} onChange={(event) => commit(`/temporaryUpdates/${index}/title`, event.target.value, "Update temporary-update title")} />
                  </Field>
                  <Field label="Mention when">
                    <Select value={update.mentionWhen} onChange={(event) => commit(`/temporaryUpdates/${index}/mentionWhen`, event.target.value, "Update temporary-update condition")}>
                      <option value="every_call">Every call</option>
                      <option value="when_relevant">Only when relevant</option>
                      <option value="after_hours">Only after hours</option>
                    </Select>
                  </Field>
                  <Field label="Message" className="md:col-span-2">
                    <Textarea value={update.message} onChange={(event) => commit(`/temporaryUpdates/${index}/message`, event.target.value, "Update temporary message")} />
                  </Field>
                  <SettingRow
                    title="Remove automatically"
                    description="Expire the update at the configured time instead of leaving it active."
                    checked={update.removeAutomatically}
                    onChange={(next) => commit(`/temporaryUpdates/${index}/removeAutomatically`, next, "Change temporary-update expiry behavior")}
                  />
                </div>
              </ItemCard>
            ))
          ) : (
            <EmptyState title="No temporary updates" description="The permanent Answering Plan remains active until a temporary update is added." />
          )}
        </div>
      </div>
    );
  }

  if (section === "offerings") {
    return (
      <div>
        <SectionHeading
          icon={<Sparkles className="size-5" />}
          title="What You Offer"
          description="Each offering carries both approved knowledge and configurable behavior."
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              commit(
                "/offerings/-",
                {
                  id: `offering_${Date.now()}`,
                  enabled: true,
                  name: "New offering",
                  title: null,
                  description: null,
                  aliases: [],
                  canAnswerQuestions: true,
                  requestable: true,
                  bookable: false,
                  canSendBookingLink: false,
                  pricing: {
                    mode: "do_not_quote",
                    currency: "CAD",
                    startingPrice: null,
                    minimumPrice: null,
                    maximumPrice: null,
                    fixedPrice: null,
                    approvedWording: null,
                  },
                  requestTypeId: null,
                  intakeFieldIds: [],
                  locationIds: [],
                  linkIds: [],
                  additionalInstructions: null,
                },
                "Add offering",
              )
            }
          >
            <Plus className="size-4" /> Add offering
          </Button>
        </SectionHeading>
        <div className="space-y-4">
          {doc.offerings.map((offering, index) => (
            <ItemCard
              key={offering.id}
              title={offering.name}
              subtitle={offering.description}
              enabled={offering.enabled}
              onEnabledChange={(next) => commit(`/offerings/${index}/enabled`, next, `${next ? "Enable" : "Disable"} ${offering.name}`)}
              badge={offering.bookable ? "Bookable" : offering.requestable ? "Requestable" : "Information only"}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                  <Input value={offering.name} onChange={(event) => commit(`/offerings/${index}/name`, event.target.value, "Rename offering")} />
                </Field>
                <Field label="Display title">
                  <Input value={offering.title ?? ""} onChange={(event) => commit(`/offerings/${index}/title`, event.target.value || null, "Update offering title")} />
                </Field>
                <Field label="Description" className="md:col-span-2">
                  <Textarea value={offering.description ?? ""} onChange={(event) => commit(`/offerings/${index}/description`, event.target.value || null, "Update offering description")} />
                </Field>
                <div className="rounded-xl border border-slate-200 px-4 md:col-span-2">
                  <SettingRow title="Answer questions" description="Allow Answerley to explain this offering using approved information." checked={offering.canAnswerQuestions} onChange={(next) => commit(`/offerings/${index}/canAnswerQuestions`, next, "Change offering question behavior")} />
                  <SettingRow title="Caller can request this" description="Allow the offering to create a request in the Requests dashboard." checked={offering.requestable} onChange={(next) => commit(`/offerings/${index}/requestable`, next, "Change offering request behavior")} />
                  <SettingRow title="Caller can book this" description="Enable a booking workflow for this offering." checked={offering.bookable} onChange={(next) => commit(`/offerings/${index}/bookable`, next, "Change offering booking behavior", "medium")} />
                  <SettingRow title="Send booking link" description="Let a configured workflow prepare or send the linked booking URL." checked={offering.canSendBookingLink} onChange={(next) => commit(`/offerings/${index}/canSendBookingLink`, next, "Change offering booking-link behavior", "medium")} />
                </div>
                <Field label="Pricing behavior">
                  <Select value={offering.pricing.mode} onChange={(event) => commit(`/offerings/${index}/pricing/mode`, event.target.value, "Change pricing behavior", "high")}>
                    <option value="do_not_quote">Do not quote pricing</option>
                    <option value="starting_price">Give starting price</option>
                    <option value="range">Use approved range</option>
                    <option value="fixed">Give fixed price</option>
                    <option value="approved_custom_wording">Use approved wording</option>
                  </Select>
                </Field>
                <Field label="Approved pricing wording">
                  <Input value={offering.pricing.approvedWording ?? ""} onChange={(event) => commit(`/offerings/${index}/pricing/approvedWording`, event.target.value || null, "Update approved pricing wording", "high")} />
                </Field>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    );
  }

  if (section === "hoursAvailability") {
    const days = Object.entries(doc.hoursAvailability.regularHours) as Array<[
      keyof typeof doc.hoursAvailability.regularHours,
      (typeof doc.hoursAvailability.regularHours)[keyof typeof doc.hoursAvailability.regularHours],
    ]>;
    return (
      <div>
        <SectionHeading icon={<Clock3 className="size-5" />} title="Hours & Availability" description="Regular hours, exceptions, timezone, and what Answerley should do outside business hours.">
          <Toggle checked={doc.hoursAvailability.enabled} onChange={(next) => commit("/hoursAvailability/enabled", next, "Change hours availability", "medium")} label="Hours enabled" />
        </SectionHeading>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="p-5">
            <div className="grid gap-3">
              {days.map(([day, schedule]) => {
                const firstPeriod = schedule.periods[0];
                return (
                  <div key={day} className="grid items-center gap-3 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[110px_48px_1fr]">
                    <span className="text-sm font-semibold capitalize text-slate-800">{day}</span>
                    <Toggle
                      checked={schedule.open}
                      onChange={(next) =>
                        commit(
                          `/hoursAvailability/regularHours/${day}`,
                          {
                            ...schedule,
                            open: next,
                            periods:
                              next && schedule.periods.length === 0
                                ? [{ opensAt: "09:00", closesAt: "17:00" }]
                                : schedule.periods,
                          },
                          `${next ? "Open" : "Close"} ${day}`,
                          "medium",
                        )
                      }
                      label={`${day} open`}
                    />
                    {schedule.open ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" value={firstPeriod?.opensAt ?? "09:00"} onChange={(event) => commit(`/hoursAvailability/regularHours/${day}/periods/0/opensAt`, event.target.value, `Change ${day} opening time`, "medium")} />
                        <span className="text-sm text-slate-400">to</span>
                        <Input type="time" value={firstPeriod?.closesAt ?? "17:00"} onChange={(event) => commit(`/hoursAvailability/regularHours/${day}/periods/0/closesAt`, event.target.value, `Change ${day} closing time`, "medium")} />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <Field label="Timezone">
                <Input value={doc.hoursAvailability.timezone ?? ""} onChange={(event) => commit("/hoursAvailability/timezone", event.target.value || null, "Update hours timezone")} />
              </Field>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">After-hours behavior</h3>
                  <p className="mt-1 text-sm text-slate-500">Controls what happens when regular hours are closed.</p>
                </div>
                <Toggle checked={doc.hoursAvailability.afterHours.enabled} onChange={(next) => commit("/hoursAvailability/afterHours/enabled", next, "Change after-hours handling", "high")} label="After-hours enabled" />
              </div>
              <div className="mt-4 space-y-4">
                <Field label="Mode">
                  <Select value={doc.hoursAvailability.afterHours.mode} onChange={(event) => commit("/hoursAvailability/afterHours/mode", event.target.value, "Change after-hours mode", "high")}>
                    <option value="same_as_open_hours">Same as open hours</option>
                    <option value="take_message">Take a message</option>
                    <option value="offer_next_available">Offer next available</option>
                    <option value="transfer">Transfer</option>
                    <option value="custom">Custom</option>
                  </Select>
                </Field>
                <Field label="Caller wording">
                  <Textarea value={doc.hoursAvailability.afterHours.callerWording ?? ""} onChange={(event) => commit("/hoursAvailability/afterHours/callerWording", event.target.value || null, "Update after-hours wording")} />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (section === "locationsCoverage") {
    return (
      <div>
        <SectionHeading icon={<MapPin className="size-5" />} title="Locations & Coverage" description="Supports physical locations, service areas, remote availability, or businesses where location does not apply.">
          <Toggle checked={doc.locationsCoverage.enabled} onChange={(next) => commit("/locationsCoverage/enabled", next, "Change location and coverage handling")} label="Locations enabled" />
        </SectionHeading>
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Coverage mode">
              <Select value={doc.locationsCoverage.mode} onChange={(event) => commit("/locationsCoverage/mode", event.target.value, "Change coverage mode")}>
                <option value="single_location">Single location</option>
                <option value="multiple_locations">Multiple locations</option>
                <option value="service_area">Service area</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="not_applicable">Not applicable</option>
              </Select>
            </Field>
            <Field label="Caller-facing description">
              <Input value={doc.locationsCoverage.callerFacingDescription ?? ""} onChange={(event) => commit("/locationsCoverage/callerFacingDescription", event.target.value || null, "Update coverage description")} />
            </Field>
          </div>
        </Card>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Locations</h3>
              <Badge tone="neutral">{doc.locationsCoverage.locations.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {doc.locationsCoverage.locations.map((location, index) => (
                <div key={location.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{location.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{[location.address.city, location.address.region].filter(Boolean).join(", ") || "Address not set"}</p>
                    </div>
                    <Toggle checked={location.enabled} onChange={(next) => commit(`/locationsCoverage/locations/${index}/enabled`, next, "Change location availability")} label={`${location.name} enabled`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Coverage rules</h3>
              <Badge tone="neutral">{doc.locationsCoverage.serviceAreas.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {doc.locationsCoverage.serviceAreas.map((area, index) => (
                <div key={area.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{area.value}</p>
                    </div>
                    <Toggle checked={area.enabled} onChange={(next) => commit(`/locationsCoverage/serviceAreas/${index}/enabled`, next, "Change service area availability")} label={`${area.label} enabled`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (section === "knowledgeItems") {
    return (
      <div>
        <SectionHeading icon={<BookOpen className="size-5" />} title="FAQs & Policies" description="Approved questions and answers with explicit behavior for how Answerley may use each item.">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              commit(
                "/knowledgeItems/-",
                {
                  id: `knowledge_${Date.now()}`,
                  enabled: true,
                  type: "faq",
                  title: "New question",
                  question: "Add a caller question",
                  alternativeQuestions: [],
                  answer: "Add the approved answer",
                  behavior: { mode: "answer_directly", linkId: null, routingRuleId: null },
                  appliesTo: { offeringIds: [], locationIds: [] },
                  internalNotes: null,
                },
                "Add FAQ or policy",
              )
            }
          >
            <Plus className="size-4" /> Add item
          </Button>
        </SectionHeading>
        <div className="space-y-4">
          {doc.knowledgeItems.map((item, index) => (
            <ItemCard key={item.id} title={item.title} subtitle={item.question} enabled={item.enabled} onEnabledChange={(next) => commit(`/knowledgeItems/${index}/enabled`, next, `${next ? "Enable" : "Disable"} ${item.title}`)} badge={formatLabel(item.type)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Question">
                  <Input value={item.question} onChange={(event) => commit(`/knowledgeItems/${index}/question`, event.target.value, "Update knowledge question")} />
                </Field>
                <Field label="Behavior">
                  <Select value={item.behavior.mode} onChange={(event) => commit(`/knowledgeItems/${index}/behavior/mode`, event.target.value, "Change knowledge behavior", "medium")}>
                    <option value="answer_directly">Answer directly</option>
                    <option value="answer_and_send_link">Answer and send link</option>
                    <option value="take_message">Take message</option>
                    <option value="escalate">Escalate</option>
                    <option value="do_not_answer">Do not answer</option>
                  </Select>
                </Field>
                <Field label="Approved answer" className="md:col-span-2">
                  <Textarea value={item.answer} onChange={(event) => commit(`/knowledgeItems/${index}/answer`, event.target.value, "Update approved answer", "medium")} />
                </Field>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    );
  }

  if (section === "requestsIntake") {
    return (
      <div>
        <SectionHeading icon={<CheckCircle2 className="size-5" />} title="Requests & Intake" description="Generic request records and configurable fields keep the product useful across businesses without vertical-specific code." />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Request types</h3>
                <p className="mt-1 text-sm text-slate-500">What callers can ask the business to do.</p>
              </div>
              <Badge tone="neutral">{doc.requestTypes.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {doc.requestTypes.map((request, index) => (
                <div key={request.id} className={cn("rounded-xl border border-slate-200 p-4", !request.enabled && "bg-slate-50 opacity-70")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{request.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{request.completionMode.replaceAll("_", " ")}</p>
                    </div>
                    <Toggle checked={request.enabled} onChange={(next) => commit(`/requestTypes/${index}/enabled`, next, "Change request type availability")} label={`${request.name} enabled`} />
                  </div>
                  <Field label="Confirmation wording" className="mt-4">
                    <Textarea value={request.confirmationWording ?? ""} onChange={(event) => commit(`/requestTypes/${index}/confirmationWording`, event.target.value || null, "Update request confirmation wording")} />
                  </Field>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Intake fields</h3>
                <p className="mt-1 text-sm text-slate-500">What Answerley may collect and when.</p>
              </div>
              <Badge tone="neutral">{doc.intakeFields.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {doc.intakeFields.map((field, index) => (
                <div key={field.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{field.label}</p>
                      {field.required ? <Badge tone="warning">Required</Badge> : <Badge tone="neutral">Optional</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatLabel(field.type)} · {formatLabel(field.askWhen.mode)}</p>
                  </div>
                  <Toggle checked={field.enabled} onChange={(next) => commit(`/intakeFields/${index}/enabled`, next, "Change intake field availability")} label={`${field.label} enabled`} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (section === "booking") {
    return (
      <div>
        <SectionHeading icon={<CalendarDays className="size-5" />} title="Booking" description="Booking remains optional. When enabled, the selected method controls which fields become required.">
          <Toggle checked={doc.booking.enabled} onChange={(next) => commit("/booking/enabled", next, "Change booking availability", "high")} label="Booking enabled" />
        </SectionHeading>
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default method">
              <Select value={doc.booking.defaultMethod} onChange={(event) => commit("/booking/defaultMethod", event.target.value, "Change booking method", "high")}>
                <option value="none">None</option>
                <option value="send_link">Send booking link</option>
                <option value="collect_preferred_time">Collect preferred time</option>
                <option value="connected_calendar">Connected calendar</option>
                <option value="book_directly">Book directly</option>
                <option value="request_only">Request only</option>
              </Select>
            </Field>
            <Field label="Booking link">
              <Select value={doc.booking.bookingLinkId ?? ""} onChange={(event) => commit("/booking/bookingLinkId", event.target.value || null, "Change booking link", "high")}>
                <option value="">No link selected</option>
                {doc.links.filter((link) => link.enabled).map((link) => <option key={link.id} value={link.id}>{link.label}</option>)}
              </Select>
            </Field>
            <Field label="Confirmation wording" className="md:col-span-2">
              <Textarea value={doc.booking.confirmationWording ?? ""} onChange={(event) => commit("/booking/confirmationWording", event.target.value || null, "Update booking confirmation wording")} />
            </Field>
          </div>
        </Card>
      </div>
    );
  }

  if (section === "scenarios") {
    return (
      <div>
        <SectionHeading icon={<Route className="size-5" />} title="Common Call Scenarios" description="A generic when-this-happens workflow: conditions, ordered actions, collection, notifications, and fallback." />
        <div className="space-y-4">
          {doc.scenarios.map((scenario, index) => (
            <ItemCard key={scenario.id} title={scenario.name} subtitle={scenario.whenCaller} enabled={scenario.enabled} onEnabledChange={(next) => commit(`/scenarios/${index}/enabled`, next, `${next ? "Enable" : "Disable"} ${scenario.name}`, "medium")} badge={`Priority ${scenario.priority}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="When caller" className="md:col-span-2">
                  <Textarea value={scenario.whenCaller} onChange={(event) => commit(`/scenarios/${index}/whenCaller`, event.target.value, "Update scenario condition", "medium")} />
                </Field>
                <Field label="Fallback">
                  <Select value={scenario.fallback.mode} onChange={(event) => commit(`/scenarios/${index}/fallback/mode`, event.target.value, "Change scenario fallback", "high")}>
                    <option value="take_message">Take message</option>
                    <option value="notify">Notify</option>
                    <option value="transfer">Transfer</option>
                    <option value="unknown_handling">Use unknown handling</option>
                    <option value="custom">Custom</option>
                  </Select>
                </Field>
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-slate-800">Ordered actions</span>
                  <div className="flex flex-wrap gap-2">
                    {scenario.actions.map((action, actionIndex) => <Badge key={`${scenario.id}-${actionIndex}`} tone="purple">{formatLabel(action.type)}</Badge>)}
                  </div>
                </div>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    );
  }

  if (section === "routing") {
    return (
      <div>
        <SectionHeading icon={<PhoneForwarded className="size-5" />} title="Routing & Escalation" description="Contacts and teams are reusable destinations. Rules decide when to transfer, notify, take a message, or fall back.">
          <Toggle checked={doc.routing.enabled} onChange={(next) => commit("/routing/enabled", next, "Change routing availability", "high")} label="Routing enabled" />
        </SectionHeading>
        <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">People & teams</h3>
              <Badge tone="neutral">{doc.routing.contacts.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {doc.routing.contacts.map((contact, index) => (
                <div key={contact.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{contact.roleLabel ?? "Contact"}</p>
                    </div>
                    <Toggle checked={contact.enabled} onChange={(next) => commit(`/routing/contacts/${index}/enabled`, next, "Change routing contact availability", "high")} label={`${contact.name} enabled`} />
                  </div>
                  <Field label="Phone" className="mt-4">
                    <Input value={contact.phone ?? ""} placeholder="Required for transfers or SMS alerts" onChange={(event) => commit(`/routing/contacts/${index}/phone`, event.target.value || null, "Update routing phone", "high")} />
                  </Field>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            {doc.routing.rules.map((rule, index) => (
              <ItemCard key={rule.id} title={rule.name} subtitle={rule.appliesWhen.customCondition ?? "Configured routing condition"} enabled={rule.enabled} onEnabledChange={(next) => commit(`/routing/rules/${index}/enabled`, next, `${next ? "Enable" : "Disable"} routing rule`, "high") } badge={formatLabel(rule.appliesWhen.timeMode)}>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="During business hours">
                    <Select value={rule.duringBusinessHours.action} onChange={(event) => commit(`/routing/rules/${index}/duringBusinessHours/action`, event.target.value, "Change business-hours routing", "high")}>
                      <option value="transfer">Transfer</option><option value="take_message">Take message</option><option value="notify">Notify</option><option value="take_message_and_notify">Message + notify</option><option value="custom">Custom</option>
                    </Select>
                  </Field>
                  <Field label="After hours">
                    <Select value={rule.afterHours.action} onChange={(event) => commit(`/routing/rules/${index}/afterHours/action`, event.target.value, "Change after-hours routing", "high")}>
                      <option value="transfer">Transfer</option><option value="take_message">Take message</option><option value="notify">Notify</option><option value="take_message_and_notify">Message + notify</option><option value="custom">Custom</option>
                    </Select>
                  </Field>
                  <Field label="If unanswered">
                    <Select value={rule.ifUnanswered.action} onChange={(event) => commit(`/routing/rules/${index}/ifUnanswered/action`, event.target.value, "Change routing fallback", "high")}>
                      <option value="take_message">Take message</option><option value="notify">Notify</option><option value="take_message_and_notify">Message + notify</option><option value="custom">Custom</option>
                    </Select>
                  </Field>
                </div>
              </ItemCard>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === "followUps") {
    return (
      <div>
        <SectionHeading icon={<MessageSquareText className="size-5" />} title="Follow-up & Messages" description="Trigger-based caller messages, owner alerts, links, sending windows, and enabled states." />
        <div className="space-y-4">
          {doc.followUps.map((rule, index) => (
            <ItemCard key={rule.id} title={rule.name} subtitle={`When: ${formatLabel(rule.trigger)}`} enabled={rule.enabled} onEnabledChange={(next) => commit(`/followUps/${index}/enabled`, next, `${next ? "Enable" : "Disable"} ${rule.name}`, "medium")} badge={formatLabel(rule.channel)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Recipient">
                  <Select value={rule.recipientType} onChange={(event) => commit(`/followUps/${index}/recipientType`, event.target.value, "Change follow-up recipient", "medium")}>
                    <option value="caller">Caller</option><option value="contact">Contact</option><option value="team">Team</option><option value="custom">Custom</option>
                  </Select>
                </Field>
                <Field label="Sending window">
                  <Select value={rule.sendingWindow.mode} onChange={(event) => commit(`/followUps/${index}/sendingWindow/mode`, event.target.value, "Change sending window", "medium")}>
                    <option value="anytime">Anytime</option><option value="business_hours">Business hours</option><option value="custom">Custom</option>
                  </Select>
                </Field>
                <Field label="Message" className="md:col-span-2">
                  <Textarea value={rule.messageText} onChange={(event) => commit(`/followUps/${index}/messageText`, event.target.value, "Update follow-up message", "medium")} />
                </Field>
                <div className="rounded-xl border border-slate-200 px-4 md:col-span-2">
                  <SettingRow title="Include link" description="Include the linked booking, contact, or other approved URL." checked={rule.includeLink} onChange={(next) => commit(`/followUps/${index}/includeLink`, next, "Change link inclusion", "medium")} />
                  <SettingRow title="Notify owner" description="Also create an internal owner notification when this rule runs." checked={rule.notifyOwner} onChange={(next) => commit(`/followUps/${index}/notifyOwner`, next, "Change owner notification", "medium")} />
                </div>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    );
  }

  if (section === "unknownHandling") {
    return (
      <div>
        <SectionHeading icon={<AlertCircle className="size-5" />} title="Unknown Handling" description="The universal fallback that keeps the assistant useful when the plan does not contain a confirmed answer.">
          <Toggle checked={doc.unknownHandling.enabled} onChange={(next) => commit("/unknownHandling/enabled", next, "Change unknown-question handling", "high")} label="Unknown handling enabled" />
        </SectionHeading>
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default action">
              <Select value={doc.unknownHandling.defaultAction} onChange={(event) => commit("/unknownHandling/defaultAction", event.target.value, "Change unknown-question action", "high")}>
                <option value="take_message">Take message</option><option value="create_request">Create request</option><option value="notify">Notify</option><option value="transfer">Transfer</option><option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Clarification attempts">
              <Select value={String(doc.unknownHandling.maximumClarificationAttempts)} onChange={(event) => commit("/unknownHandling/maximumClarificationAttempts", Number(event.target.value), "Change clarification attempts", "medium")}>
                <option value="0">None</option><option value="1">One</option><option value="2">Two</option><option value="3">Three</option>
              </Select>
            </Field>
            <Field label="Caller wording" className="md:col-span-2">
              <Textarea value={doc.unknownHandling.callerWording} onChange={(event) => commit("/unknownHandling/callerWording", event.target.value, "Update unknown-question wording", "high")} />
            </Field>
            <div className="rounded-xl border border-slate-200 px-4 md:col-span-2">
              <SettingRow title="Ask a clarifying question" description="Clarify the caller’s meaning before using the fallback." checked={doc.unknownHandling.askClarifyingQuestion} onChange={(next) => commit("/unknownHandling/askClarifyingQuestion", next, "Change clarification behavior", "medium")} />
              <SettingRow title="Create improvement suggestion" description="Surface unanswered questions beside the test call and later in the dashboard." checked={doc.unknownHandling.createImprovementSuggestion} onChange={(next) => commit("/unknownHandling/createImprovementSuggestion", next, "Change improvement suggestions")} />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (section === "spamScreening") {
    return (
      <div>
        <SectionHeading icon={<ShieldCheck className="size-5" />} title="Spam Screening" description="Generic robocall and suspected-spam controls, independent of any business vertical.">
          <Toggle checked={doc.spamScreening.enabled} onChange={(next) => commit("/spamScreening/enabled", next, "Change spam screening", "medium")} label="Spam screening enabled" />
        </SectionHeading>
        <Card className="px-5">
          <SettingRow title="Block likely robocalls" description="Prevent high-confidence robocalls from entering the normal call flow." checked={doc.spamScreening.blockLikelyRobocalls} onChange={(next) => commit("/spamScreening/blockLikelyRobocalls", next, "Change robocall blocking")} />
          <SettingRow title="Hide spam from the main call feed" description="Keep suspected spam accessible without cluttering normal calls." checked={doc.spamScreening.hideLikelySpamFromCalls} onChange={(next) => commit("/spamScreening/hideLikelySpamFromCalls", next, "Change spam-feed visibility")} />
          <SettingRow title="Do not count blocked spam toward usage" description="Control whether a blocked call creates billable usage." checked={!doc.spamScreening.countBlockedTowardUsage} onChange={(next) => commit("/spamScreening/countBlockedTowardUsage", !next, "Change spam usage behavior")} />
          <SettingRow title="Let unknown local numbers through" description="Do not treat an unfamiliar local number as spam by itself." checked={doc.spamScreening.allowUnknownLocalNumbers} onChange={(next) => commit("/spamScreening/allowUnknownLocalNumbers", next, "Change unknown-number screening")} />
        </Card>
      </div>
    );
  }

  if (section === "greetingVoice") {
    return (
      <div>
        <SectionHeading icon={<Volume2 className="size-5" />} title="Greeting & Voice" description="What callers hear first and the voice behavior the Gemini Live runtime receives.">
          <Toggle checked={doc.greetingVoice.enabled} onChange={(next) => commit("/greetingVoice/enabled", next, "Change greeting and voice", "high")} label="Greeting enabled" />
        </SectionHeading>
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Assistant name">
              <Input value={doc.greetingVoice.assistantName ?? ""} onChange={(event) => commit("/greetingVoice/assistantName", event.target.value || null, "Update assistant name")} />
            </Field>
            <Field label="Voice ID">
              <Input value={doc.greetingVoice.voiceId ?? ""} onChange={(event) => commit("/greetingVoice/voiceId", event.target.value || null, "Update voice ID", "medium")} />
            </Field>
            <Field label="Tone">
              <Select value={doc.greetingVoice.tone} onChange={(event) => commit("/greetingVoice/tone", event.target.value, "Change voice tone", "medium")}>
                <option value="warm_helpful">Warm & helpful</option><option value="professional">Professional</option><option value="calm_reassuring">Calm & reassuring</option><option value="straight_to_the_point">Straight to the point</option><option value="mature_trustworthy">Mature & trustworthy</option><option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Primary language">
              <Input value={doc.greetingVoice.primaryLanguage} onChange={(event) => commit("/greetingVoice/primaryLanguage", event.target.value, "Update primary language", "medium")} />
            </Field>
            <Field label="Opening greeting" className="md:col-span-2">
              <Textarea value={doc.greetingVoice.openingGreeting ?? ""} onChange={(event) => commit("/greetingVoice/openingGreeting", event.target.value || null, "Update opening greeting", "high")} />
            </Field>
            <Field label="Closing wording" className="md:col-span-2">
              <Textarea value={doc.greetingVoice.closingWording ?? ""} onChange={(event) => commit("/greetingVoice/closingWording", event.target.value || null, "Update closing wording")} />
            </Field>
          </div>
        </Card>
      </div>
    );
  }

  if (section === "links") {
    return (
      <div>
        <SectionHeading icon={<Link2 className="size-5" />} title="Reusable Links" description="Approved URLs are reusable across offerings, knowledge, booking, and messages instead of being copied into multiple places." />
        <div className="space-y-3">
          {doc.links.map((link, index) => (
            <Card key={link.id} className="p-4">
              <div className="grid items-center gap-4 md:grid-cols-[1fr_1.6fr_auto]">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatLabel(link.type)}</p>
                </div>
                <Input type="url" value={link.url} onChange={(event) => commit(`/links/${index}/url`, event.target.value, "Update reusable link", "medium")} />
                <Toggle checked={link.enabled} onChange={(next) => commit(`/links/${index}/enabled`, next, "Change reusable link availability", "medium")} label={`${link.label} enabled`} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (section === "globalRules") {
    return (
      <div>
        <SectionHeading icon={<SlidersHorizontal className="size-5" />} title="Global Rules" description="Cross-cutting behavior shared by all enabled sections and compiled into the voice runtime." />
        <Card className="px-5">
          <SettingRow title="Use approved knowledge only" description="Business facts must come from the active Answering Plan or successful tools." checked={doc.globalRules.approvedKnowledgeOnly} onChange={(next) => commit("/globalRules/approvedKnowledgeOnly", next, "Change approved-knowledge rule", "high")} />
          <SettingRow title="Do not invent business facts" description="Unknown prices, policies, hours, availability, or promises use the configured fallback." checked={doc.globalRules.doNotInventBusinessFacts} onChange={(next) => commit("/globalRules/doNotInventBusinessFacts", next, "Change grounding rule", "high")} />
          <SettingRow title="Ask one question at a time" description="Keep intake natural and phone-friendly." checked={doc.globalRules.askOneQuestionAtATime} onChange={(next) => commit("/globalRules/askOneQuestionAtATime", next, "Change intake style")} />
          <SettingRow title="Avoid repeating collected information" description="The call agent reuses values already captured in the active call." checked={doc.globalRules.avoidRepeatingCollectedInformation} onChange={(next) => commit("/globalRules/avoidRepeatingCollectedInformation", next, "Change repetition rule")} />
          <SettingRow title="Confirm before creating a request" description="Briefly verify important details before a request is recorded." checked={doc.globalRules.confirmBeforeCreatingRequest} onChange={(next) => commit("/globalRules/confirmBeforeCreatingRequest", next, "Change request confirmation rule", "medium")} />
        </Card>
      </div>
    );
  }

  return (
    <EmptyState
      icon={<Globe2 className="size-5" />}
      title="Section registered"
      description="This section exists in the canonical plan registry and can receive a dedicated editor without changing the underlying contract."
    />
  );
}
