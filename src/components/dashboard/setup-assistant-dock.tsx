"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Check,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  applySetupChange,
  demoAnsweringSetup,
  labelSbaValue,
  setupSections,
  type AnsweringSetup,
  type SetupChangeProposal,
} from "@/domain/small-business-answering";
import {
  loadSbaWorkspace,
  saveSbaWorkspace,
  type StoredMessage,
  type StoredRequest,
  type StoredTestCall,
} from "@/lib/sba-client-storage";
import { cn } from "@/lib/utils";

type AssistantResult =
  | { type: "answer"; answer: string }
  | { type: "clarification"; question: string; choices?: string[]; reason?: string }
  | { type: "proposal"; proposal: SetupChangeProposal };

type ChatAction = {
  label: string;
  href?: string;
  prompt?: string;
};

type ChatEntry = {
  id: string;
  role: "owner" | "assistant";
  text: string;
  actions?: ChatAction[];
};

const welcomeText = [
  "I can update the answering setup, answer what callers will hear, explain calls and requests, and send you to the right dashboard screen.",
  "Changes to the setup are prepared for review before they are saved.",
].join(" ");

const defaultPrompts = [
  "What happens after hours?",
  "Do not quote prices on calls.",
  "Change Friday closing to 4 PM.",
  "What appointment requests were captured?",
];

function entryId(role: ChatEntry["role"]) {
  return `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isSetupChangeIntent(value: string) {
  return /\b(change|update|edit|set|add|remove|delete|turn on|turn off|enable|disable|don't|do not|never|quote|pricing|price|hours?|close|open|greeting|service|answer|warranty|booking link|appointment mode|owner alert|urgent|spam|recording|privacy|timezone|phone number|email)\b/i.test(value);
}

function isOperationalCrudIntent(value: string) {
  return /\b(mark|complete|archive|delete|assign|book|contacted|change status|close request|reopen)\b/i.test(value)
    && /\b(request|appointment|message|call)\b/i.test(value);
}

function requestTypeLabel(value: StoredRequest["requestType"]) {
  if (value === "appointment") return "appointment request";
  if (value === "urgent") return "urgent request";
  if (value === "callback") return "callback";
  return labelSbaValue(value).toLowerCase();
}

function proposalSections(proposal: SetupChangeProposal) {
  const paths = proposal.affectedPaths.length
    ? proposal.affectedPaths
    : proposal.operations.map((operation) => operation.path);
  return setupSections
    .filter((section) =>
      paths.some((path) =>
        section.setupPaths.some((sectionPath) => path === sectionPath || path.startsWith(`${sectionPath}/`)),
      ),
    )
    .map((section) => section.label);
}

function suggestionsForPath(pathname: string) {
  if (pathname.includes("/requests")) {
    return ["Summarize open requests.", "Can you mark a request complete?", "What details do we collect?"];
  }
  if (pathname.includes("/appointments")) {
    return ["How are appointments handled?", "Change appointment mode to request only.", "Show appointment requests."];
  }
  if (pathname.includes("/test-center")) {
    return ["What should I test next?", "What will callers hear?", "Add a warranty answer."];
  }
  if (pathname.includes("/answering-setup")) {
    return ["What needs review?", "Update owner alert email.", "Do not quote prices."];
  }
  if (pathname.includes("/calls")) {
    return ["Summarize the latest call.", "What actions happened?", "Improve future calls from this."];
  }
  return defaultPrompts;
}

function buildWorkspaceAnswer(params: {
  instruction: string;
  setup: AnsweringSetup;
  testCall: StoredTestCall | null;
  requests: StoredRequest[];
  messages: StoredMessage[];
}): ChatEntry | null {
  const { instruction, setup, testCall, requests, messages } = params;
  const normalized = instruction.trim().toLowerCase();

  if (/\b(what can you do|help|capabilities|what do you do)\b/.test(normalized)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: welcomeText,
      actions: [
        { label: "Review setup", href: "/dashboard/answering-setup" },
        { label: "Open Test Center", href: "/dashboard/test-center" },
      ],
    };
  }

  if (isOperationalCrudIntent(instruction)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: "I can explain and open captured calls, requests, appointments, and messages. Direct status changes to those records need the request-detail workflow and verified ownership, so I will not mutate them from chat yet.",
      actions: [
        { label: "Open Requests", href: "/dashboard/requests" },
        { label: "Open Appointments", href: "/dashboard/appointments" },
      ],
    };
  }

  if (/\b(phone setup|connect phone|forwarding|number)\b/.test(normalized) && !isSetupChangeIntent(instruction)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: "Phone setup is a launch step outside the answering setup. I can help review call handling now, then phone connection is finished from Phone Setup before real callers are connected.",
      actions: [{ label: "Open Phone Setup", href: "/dashboard/phone-setup" }],
    };
  }

  if (/\b(billing|payment|invoice|plan)\b/.test(normalized)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: "Billing is separate from the answering setup. You can build and test now; payment is completed before live answering is activated.",
      actions: [{ label: "Open Billing", href: "/dashboard/billing" }],
    };
  }

  if (/\b(settings|sign in|login|team|account|auth)\b/.test(normalized)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: "Account and team settings stay limited until sign-in is wired. I can still update the answering setup and explain the current workspace.",
      actions: [{ label: "Open Settings", href: "/dashboard/settings" }],
    };
  }

  if (/\b(test center|run test|test call|try a call|simulate)\b/.test(normalized)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: "Use Test Center to run caller scenarios against the current setup. Saved tests appear in Calls, Requests, Appointments, and Overview.",
      actions: [{ label: "Open Test Center", href: "/dashboard/test-center" }],
    };
  }

  if (/\b(requests?|appointment requests?|appointments?)\b/.test(normalized) && !isSetupChangeIntent(instruction)) {
    const appointmentCount = requests.filter((request) => request.requestType === "appointment").length;
    const openCount = requests.filter((request) => !["completed", "archived"].includes(request.status)).length;
    const latest = requests[0];
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: requests.length
        ? `There are ${openCount} open request${openCount === 1 ? "" : "s"} and ${appointmentCount} appointment request${appointmentCount === 1 ? "" : "s"}. Latest: ${latest.summary ?? requestTypeLabel(latest.requestType)}${latest.preferredTime ? `, preferred time ${latest.preferredTime}` : ""}.`
        : "No requests have been captured yet. Run an appointment or message scenario in Test Center to create the first test request.",
      actions: [
        { label: "Open Requests", href: "/dashboard/requests" },
        { label: "Open Appointments", href: "/dashboard/appointments" },
      ],
    };
  }

  if (/\b(calls?|latest call|transcript)\b/.test(normalized) && !isSetupChangeIntent(instruction)) {
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: testCall
        ? `Latest test call: ${testCall.summary} It has ${testCall.transcript.length} transcript turn${testCall.transcript.length === 1 ? "" : "s"} and ${testCall.outcomes.length} action${testCall.outcomes.length === 1 ? "" : "s"}.`
        : "No call has been saved yet. Run a test call to review the transcript and captured actions.",
      actions: [
        { label: testCall ? "View Call" : "Open Test Center", href: testCall ? "/dashboard/calls/test-call" : "/dashboard/test-center" },
      ],
    };
  }

  if (/\b(messages?|alerts?|owner notified|notifications?)\b/.test(normalized) && !isSetupChangeIntent(instruction)) {
    const alertContacts = setup.ownerAlerts.contacts.filter((contact) => contact.enabled).length;
    return {
      id: entryId("assistant"),
      role: "assistant",
      text: messages.length
        ? `There are ${messages.length} prepared message${messages.length === 1 ? "" : "s"} in this workspace. The setup currently has ${alertContacts} enabled alert contact${alertContacts === 1 ? "" : "s"}.`
        : `No messages have been prepared yet. The setup currently has ${alertContacts} enabled alert contact${alertContacts === 1 ? "" : "s"}.`,
      actions: [{ label: "Review Owner Alerts", href: "/dashboard/answering-setup" }],
    };
  }

  return null;
}

export function SetupAssistantDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  const [testCall, setTestCall] = useState<StoredTestCall | null>(null);
  const [requests, setRequests] = useState<StoredRequest[]>([]);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [instruction, setInstruction] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: "welcome",
      role: "assistant",
      text: welcomeText,
      actions: [
        { label: "What happens after hours?", prompt: "What happens after hours?" },
        { label: "Open Test Center", href: "/dashboard/test-center" },
      ],
    },
  ]);
  const [pendingProposal, setPendingProposal] = useState<SetupChangeProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const quickPrompts = useMemo(() => suggestionsForPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => {
      void loadSbaWorkspace().then((workspace) => {
        if (cancelled) return;
        if (workspace.setup) setSetup(workspace.setup);
        setTestCall(workspace.testCall ?? null);
        setRequests(workspace.requests ?? []);
        setMessages(workspace.messages ?? []);
      });
    };
    refreshWorkspace();
    window.addEventListener("sba-workspace-updated", refreshWorkspace);
    window.addEventListener("storage", refreshWorkspace);
    return () => {
      cancelled = true;
      window.removeEventListener("sba-workspace-updated", refreshWorkspace);
      window.removeEventListener("storage", refreshWorkspace);
    };
  }, [open]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, pendingProposal]);

  function addEntry(entry: Omit<ChatEntry, "id">) {
    setEntries((current) => [...current, { ...entry, id: entryId(entry.role) }]);
  }

  async function submitInstruction(input?: string) {
    const trimmed = (input ?? instruction).trim();
    if (!trimmed || busy) return;
    setInstruction("");
    setPendingProposal(null);
    setBusy(true);
    addEntry({ role: "owner", text: trimmed });

    const localAnswer = buildWorkspaceAnswer({ instruction: trimmed, setup, testCall, requests, messages });
    if (localAnswer) {
      setEntries((current) => [...current, localAnswer]);
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/dev/plan-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup, instruction: trimmed }),
      });
      const body = (await response.json()) as { result?: AssistantResult; error?: string };
      if (!response.ok || !body.result) throw new Error(body.error ?? "I could not prepare that update.");
      if (body.result.type === "proposal") {
        setPendingProposal(body.result.proposal);
        addEntry({
          role: "assistant",
          text: `I prepared an update: ${body.result.proposal.summary}. Review it before saving.`,
        });
      } else if (body.result.type === "clarification") {
        addEntry({
          role: "assistant",
          text: body.result.question,
          actions: body.result.choices?.map((choice) => ({ label: choice, prompt: `${trimmed} ${choice}` })),
        });
      } else {
        addEntry({ role: "assistant", text: body.result.answer });
      }
    } catch (error) {
      addEntry({ role: "assistant", text: error instanceof Error ? error.message : "I could not help with that yet." });
    } finally {
      setBusy(false);
    }
  }

  async function applyProposal() {
    if (!pendingProposal) return;
    setBusy(true);
    try {
      const applied = applySetupChange(setup, pendingProposal);
      const saved = await saveSbaWorkspace({ setup: applied.setup });
      const nextSetup = saved.setup ?? applied.setup;
      setSetup(nextSetup);
      setPendingProposal(null);
      addEntry({
        role: "assistant",
        text: "Saved the update to Answering Setup. The dashboard is using the new draft now.",
        actions: [
          { label: "Review setup", href: "/dashboard/answering-setup" },
          { label: "Run a test", href: "/dashboard/test-center" },
        ],
      });
      window.dispatchEvent(new CustomEvent("sba-workspace-updated", { detail: { setup: nextSetup } }));
    } catch (error) {
      addEntry({
        role: "assistant",
        text: error instanceof Error
          ? `${error.message} Reloading the latest setup before trying again usually fixes this.`
          : "I could not save that update.",
      });
      const latest = await loadSbaWorkspace();
      if (latest.setup) setSetup(latest.setup);
    } finally {
      setBusy(false);
    }
  }

  function discardProposal() {
    setPendingProposal(null);
    addEntry({ role: "assistant", text: "No problem. I did not change the setup." });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitInstruction();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
      {open ? (
        <Card className="flex max-h-[min(720px,calc(100vh-6rem))] w-[420px] max-w-full flex-col overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,.18)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#17152a] text-white"><Sparkles className="size-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">Answering assistant</p>
                <p className="truncate text-xs text-slate-500">Ask, update, review, or find the right screen</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close answering assistant">
              <X className="size-4" />
            </button>
          </div>

          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submitInstruction(prompt)}
                  disabled={busy}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
            {entries.map((entry) => (
              <div key={entry.id} className={entry.role === "owner" ? "flex justify-end" : "flex justify-start"}>
                <div className={entry.role === "owner" ? "max-w-[86%] rounded-2xl rounded-tr-md bg-[#17152a] px-3 py-2 text-sm leading-6 text-white" : "max-w-[88%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 shadow-sm"}>
                  <p>{entry.text}</p>
                  {entry.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.actions.map((action) =>
                        action.href ? (
                          <Link key={`${entry.id}_${action.label}`} href={action.href} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            {action.label} <ChevronRight className="size-3" />
                          </Link>
                        ) : (
                          <button
                            key={`${entry.id}_${action.label}`}
                            type="button"
                            onClick={() => void submitInstruction(action.prompt ?? action.label)}
                            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {action.label}
                          </button>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {pendingProposal ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-amber-950">Review setup update</p>
                  <Badge tone={pendingProposal.riskLevel === "high" ? "danger" : pendingProposal.riskLevel === "medium" ? "warning" : "success"}>
                    {labelSbaValue(pendingProposal.riskLevel)} impact
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-800">{pendingProposal.summary}</p>
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Updates: {proposalSections(pendingProposal).join(", ") || "Answering Setup"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={applyProposal} disabled={busy} size="sm" className="bg-[#17152a] hover:bg-[#292541]">
                    <Check className="size-4" /> Apply update
                  </Button>
                  <Button onClick={discardProposal} disabled={busy} size="sm" variant="secondary">
                    Keep as is
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <Textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask what callers will hear, or say what to change..."
              className="min-h-20 resize-none"
            />
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5 text-xs text-slate-400">
                <ClipboardList className="size-3.5" />
                Review before save
              </div>
              <Button onClick={() => void submitInstruction()} disabled={busy || !instruction.trim()} className="bg-[#17152a] hover:bg-[#292541]">
                <Send className="size-4" /> {busy ? "Working..." : "Send"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 items-center gap-2 rounded-full bg-[#17152a] px-5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,.24)] hover:bg-[#292541]",
          open && "bg-[#292541]",
        )}
        aria-expanded={open}
      >
        <MessageCircle className="size-5" />
        Ask assistant
      </button>
    </div>
  );
}
