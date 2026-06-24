import { notFound } from "next/navigation";
import { CreditCard, Hash, MessageSquareText, Settings, ShieldBan, SquareCheckBig } from "lucide-react";
import { Card } from "@/components/ui/card";

const sections = {
  requests: { title: "Requests", description: "Appointments, callbacks, quotes, consultations, reservations, messages, and custom request records.", icon: SquareCheckBig },
  messages: { title: "Messages", description: "Caller messages, caller follow-ups, owner alerts, and delivery states.", icon: MessageSquareText },
  spam: { title: "Spam", description: "Blocked and screened calls, corrections, and spam settings in context.", icon: ShieldBan },
  numbers: { title: "Numbers", description: "Answerley numbers, business-number forwarding, setup state, and test calls.", icon: Hash },
  billing: { title: "Billing", description: "Subscription state, usage, plan limits, and Stripe-managed billing.", icon: CreditCard },
  settings: { title: "Settings", description: "Business profile, team access, notifications, integrations, exports, and account settings.", icon: Settings },
} as const;

export default async function PlaceholderSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = sections[section as keyof typeof sections];
  if (!config) notFound();
  const Icon = config.icon;
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">{config.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{config.description}</p>
      <Card className="mt-6 p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Icon className="size-5" /></div>
        <h2 className="mt-5 text-lg font-semibold text-slate-950">Operational contract is ready</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">The canonical schemas, SQL tables, relationships, and dashboard navigation exist. This visible screen is intentionally left for the next journey-specific Codex task instead of being filled with disconnected static UI.</p>
      </Card>
    </main>
  );
}
