"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Link2,
  SquareCheckBig,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { demoAnsweringSetup, type AnsweringSetup } from "@/domain/small-business-answering";
import { loadSbaWorkspace, type StoredRequest, type StoredTestCall } from "@/lib/sba-client-storage";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function fallbackAppointmentRequests(testCall: StoredTestCall | null): StoredRequest[] {
  if (!testCall) return [];
  return testCall.outcomes
    .filter((outcome) => outcome.type === "request" || /appointment/i.test(`${outcome.title} ${outcome.detail}`))
    .map((outcome) => ({
      id: outcome.id,
      callId: testCall.dbId ?? testCall.id,
      requestType: "appointment",
      status: "new",
      serviceId: null,
      callerName: null,
      callerPhone: null,
      callerEmail: null,
      preferredTime: outcome.detail,
      summary: outcome.title,
      urgency: "normal",
      testMode: true,
      createdAt: testCall.startedAt,
    }));
}

export function AppointmentsClient() {
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const [requests, setRequests] = useState<StoredRequest[]>([]);
  const [testCall, setTestCall] = useState<StoredTestCall | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (cancelled) return;
      if (workspace.setup) setSetup(workspace.setup);
      setRequests(workspace.requests ?? []);
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

  const appointmentRequests = useMemo(() => {
    const persisted = requests.filter((request) => request.requestType === "appointment");
    return persisted.length ? persisted : fallbackAppointmentRequests(testCall);
  }, [requests, testCall]);

  const eligibleServices = setup.services.filter((service) => service.enabled && service.appointmentEligible);
  const appointment = setup.appointmentHandling;

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Appointments</h1>
            <Badge tone="neutral">{label(appointment.mode)}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Review appointment requests and how callers are guided.</p>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
          Test appointment request <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="size-4 text-violet-600" />
              <h2 className="font-semibold text-slate-950">Handling mode</h2>
            </div>
            <Badge tone={appointment.mode === "calendar_booking" ? "success" : "warning"}>{label(appointment.mode)}</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Fact label="Booking link" value={appointment.bookingLinkUrl ? "Configured" : "Not configured"} />
            <Fact label="Calendar" value={label(appointment.calendarIntegration)} />
            <Fact label="Confirmation" value={appointment.doNotCallBookedUntilConfirmed ? "Request first" : "Can confirm directly"} />
            <Fact label="Requests" value={String(appointmentRequests.length)} />
          </div>
          {appointment.bookingLinkUrl ? (
            <a href={appointment.bookingLinkUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Open booking link <ExternalLink className="size-4" />
            </a>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <SquareCheckBig className="size-4 text-violet-600" />
            <h2 className="font-semibold text-slate-950">Captured fields</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {setup.requestCapture.fields.map((field) => <Badge key={field} tone="neutral">{label(field)}</Badge>)}
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{setup.requestCapture.callerSummaryWording}</div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Appointment requests</h2>
        </div>
        {appointmentRequests.length ? (
          <div className="divide-y divide-slate-100">
            {appointmentRequests.map((request) => (
              <div key={request.id} className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_.65fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{request.summary ?? "Appointment request"}</p>
                    {request.testMode ? <Badge tone="purple">Test</Badge> : null}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="size-3.5" /> {new Date(request.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Preferred time</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{request.preferredTime ?? "Not captured yet"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Status</p>
                  <Badge tone={request.status === "completed" || request.status === "booked" ? "success" : request.status === "contacted" ? "info" : request.status === "archived" ? "neutral" : "warning"}>{label(request.status)}</Badge>
                </div>
                <Link href="/dashboard/calls/test-call" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  View call <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-56 items-center justify-center p-6 text-center">
            <div>
              <CheckCircle2 className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-900">No appointment requests yet</p>
              <p className="mt-1 text-sm text-slate-500">Run an appointment scenario to see the first request.</p>
              <Link href="/dashboard/test-center" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
                Open Test Center <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Appointment-eligible services</h2>
          <div className="mt-4 space-y-2">
            {(eligibleServices.length ? eligibleServices : setup.services.filter((service) => service.enabled).slice(0, 3)).map((service) => (
              <div key={service.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <span className="text-sm font-semibold text-slate-800">{service.name}</span>
                <Badge tone={service.appointmentEligible ? "success" : "neutral"}>{service.appointmentEligible ? "Eligible" : "Request only"}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2"><Link2 className="size-4 text-violet-600" /><h2 className="font-semibold text-slate-950">Caller confirmations</h2></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{setup.callerConfirmations.enabled ? setup.callerConfirmations.smsTemplate ?? "Caller confirmations are enabled." : "Caller confirmations are off until an owner approves them."}</p>
        </Card>
      </div>
    </main>
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
