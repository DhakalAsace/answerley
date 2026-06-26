import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CreditCard,
  PhoneForwarded,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const sections = {
  "phone-setup": {
    title: "Phone Setup",
    description: "Business phone, answering number, forwarding method, answer timing, and routing test.",
    icon: PhoneForwarded,
    status: "Not connected",
    rows: ["Business phone is not connected", "Answering number will be assigned before launch", "Forwarding test runs before real calls"],
    cta: "Review answering setup",
  },
  billing: {
    title: "Billing",
    description: "Plan, usage, calls answered, minutes used, spam screened, payment method, and invoices.",
    icon: CreditCard,
    status: "Not active",
    rows: ["Free to build and test", "Payment is required before live calls", "Usage appears after calls begin"],
    cta: "Review setup gates",
  },
  settings: {
    title: "Settings",
    description: "Account, simple team roles, privacy, recording, data export, and workspace settings.",
    icon: Settings,
    status: "Limited until sign-in",
    rows: ["Owner sign-in is required for account changes", "Privacy controls live in Answering Setup", "Data export and deletion require verified ownership"],
    cta: "Review privacy setup",
  },
} as const;

export default async function PlaceholderSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = sections[section as keyof typeof sections];
  if (!config) notFound();
  const Icon = config.icon;
  return (
    <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">{config.title}</h1>
            <Badge tone="warning">{config.status}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{config.description}</p>
        </div>
        <Link href="/dashboard/answering-setup" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          Review setup
        </Link>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
          <div className="rounded-xl bg-slate-50 p-5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm"><Icon className="size-5" /></div>
            <p className="mt-4 text-sm font-semibold text-slate-950">Before launch</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">This section becomes fully active before real callers are connected.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">What this screen needs to show</h2>
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {config.rows.map((row) => (
                <div key={row} className="px-4 py-3 text-sm font-medium text-slate-700">{row}</div>
              ))}
            </div>
            <Link href="/dashboard/answering-setup" className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#17152a] px-4 text-sm font-semibold text-white hover:bg-[#292541]">
              {config.cta}
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
