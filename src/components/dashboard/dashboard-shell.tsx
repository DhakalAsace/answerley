"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck2,
  CreditCard,
  LayoutDashboard,
  PhoneCall,
  PhoneForwarded,
  Settings,
  Sparkles,
  SquareCheckBig,
  TestTube2,
} from "lucide-react";
import { product } from "@/lib/product";
import { calculateAnsweringSetupReadiness, demoAnsweringSetup, type AnsweringSetup } from "@/domain/small-business-answering";
import { cn } from "@/lib/utils";
import { loadSbaWorkspace } from "@/lib/sba-client-storage";
import { SetupAssistantDock } from "@/components/dashboard/setup-assistant-dock";

const items = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/calls", label: "Calls", icon: PhoneCall },
  { href: "/dashboard/requests", label: "Requests", icon: SquareCheckBig },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarCheck2 },
  { href: "/dashboard/test-center", label: "Test Center", icon: TestTube2 },
  { href: "/dashboard/answering-setup", label: "Answering Setup", icon: BookOpenCheck },
  { href: "/dashboard/phone-setup", label: "Phone Setup", icon: PhoneForwarded },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [setup, setSetup] = useState<AnsweringSetup>(demoAnsweringSetup);
  useEffect(() => {
    let cancelled = false;
    const refreshWorkspace = () => void loadSbaWorkspace().then((workspace) => {
      if (!cancelled && workspace.setup) setSetup(workspace.setup);
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
  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-screen border-r border-slate-200 bg-white lg:flex lg:flex-col lg:p-4">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#17152a] text-white"><Sparkles className="size-4" /></span>
          <span className="text-lg font-bold tracking-tight text-slate-950">{product.name}</span>
        </Link>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-400">Business</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">{setup.business.name}</p>
          <p className="mt-2 text-xs font-semibold text-amber-700">{readiness.statusLabel}</p>
        </div>
        <nav className="mt-5 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition", active ? "bg-[#17152a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
                <Icon className="size-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-lg bg-slate-950 p-4 text-white">
          <p className="text-sm font-semibold">Next step</p>
          <p className="mt-1 text-xs leading-5 text-white/70">{readiness.nextGate?.label ?? "Run a final test call."}</p>
          <Link href={readiness.testReady ? "/dashboard/test-center" : "/dashboard/answering-setup"} className="mt-3 inline-flex text-xs font-bold text-white">
            {readiness.testReady ? "Open Test Center" : "Open setup"}
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-[#17152a] text-white"><Sparkles className="size-3.5" /></span><span className="font-bold text-slate-950">{product.name}</span></Link>
            <select value={items.find((item) => pathname.startsWith(item.href))?.href ?? "/dashboard/overview"} onChange={(event) => { window.location.href = event.target.value; }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              {items.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
            </select>
          </div>
        </header>
        {children}
        <SetupAssistantDock />
      </div>
    </div>
  );
}
