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
import { Card } from "@/components/ui/card";
import { demoAnsweringSetup, labelRequestField, labelSbaValue, type AnsweringSetup } from "@/domain/small-business-answering";
import { loadSbaWorkspace, type StoredRequest, type StoredTestCall } from "@/lib/sba-client-storage";

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
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Appointments</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Review appointment requests and the caller details collected for each one.
          </p>
        </div>
        <Link href="/dashboard/test-center" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#17152a] px-4 text-sm font-semibold text-white">
          Test appointment request <ArrowRight className="size-4" />
        </Link>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-950">Appointment requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              {appointmentRequests.length ? `${appointmentRequests.length} request${appointmentRequests.length === 1 ? "" : "s"} captured` : "New appointment requests will appear here."}
            </p>
          </div>
          {appointment.bookingLinkUrl ? (
            <a href={appointment.bookingLinkUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Booking link <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>

        {appointmentRequests.length ? (
          <div className="divide-y divide-slate-100">
            {appointmentRequests.map((request) => (
              <article key={request.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,.6fr)_auto] md:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{request.summary ?? "Appointment request"}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{request.preferredTime ?? "Preferred time was not captured yet."}</p>
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {new Date(request.createdAt).toLocaleString()}</p>
                  <p>{labelSbaValue(request.status)}</p>
                </div>
                <Link href="/dashboard/calls/test-call" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  View call <ArrowRight className="size-4" />
                </Link>
              </article>
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

      <div className="mt-5 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="size-4 text-slate-600" />
            <h2 className="font-semibold text-slate-950">How callers are guided</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Fact label="Scheduling" value={labelSbaValue(appointment.mode)} />
            <Fact label="Calendar" value={labelSbaValue(appointment.calendarIntegration)} />
            <Fact label="Confirmation" value={appointment.doNotCallBookedUntilConfirmed ? "Owner approval first" : "Can confirm directly"} />
            <Fact label="Appointment services" value={String(eligibleServices.length)} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <SquareCheckBig className="size-4 text-slate-600" />
            <h2 className="font-semibold text-slate-950">Caller details collected</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {setup.requestCapture.fields.map((field) => (
              <span key={field} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {labelRequestField(field)}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">{setup.requestCapture.callerSummaryWording}</p>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-slate-600" />
          <h2 className="font-semibold text-slate-950">Caller confirmations</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {setup.callerConfirmations.enabled
            ? setup.callerConfirmations.smsTemplate ?? "Caller confirmations are enabled."
            : "Caller confirmations are off until an owner approves them."}
        </p>
      </Card>
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
