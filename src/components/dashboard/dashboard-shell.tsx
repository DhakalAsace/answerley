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
  SquareCheckBig,
  TestTube2,
} from "lucide-react";
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
  { href: "/dashboard/phone-setup", label: "Phone Setup", icon: PhoneForwarded, locked: true },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, locked: true },
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
    <div className="min-h-screen bg-[#FAFBFC] text-[#0F1115] lg:grid lg:grid-cols-[252px_1fr]">
      <aside className="hidden min-h-screen border-r border-[#D6DAE1] bg-[#FAFBFC] lg:flex lg:flex-col lg:px-4 lg:py-6">
        <Link href="/" className="flex items-center gap-3 px-1 pb-6">
          <span className="flex size-10 items-center justify-center rounded-[8px] bg-[#1565FF] text-sm font-bold text-white shadow-[0_10px_22px_rgba(21,101,255,.22)]">SBA</span>
          <span className="text-xl font-bold leading-none text-[#0F1115]">Answering</span>
        </Link>
        <div className="h-px bg-[#DDE2EA]" />
        <div className="mt-4 rounded-[10px] border border-[#E2E6ED] bg-white px-3 py-3 shadow-[0_12px_26px_rgba(15,17,21,.03)]">
          <p className="text-[11px] font-semibold uppercase text-[#727A87]">Business</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#111827]">{setup.business.name}</p>
          <p className="mt-2 text-xs font-semibold text-[#A05A00]">{readiness.statusLabel}</p>
        </div>
        <nav className="mt-4 space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-[6px] px-3 text-sm font-medium transition",
                  active
                    ? "bg-[#ECF3FF] text-[#045BFF]"
                    : "text-[#111827] hover:bg-white hover:text-[#045BFF]",
                )}
              >
                <Icon className={cn("size-[19px]", active ? "text-[#045BFF]" : "text-[#4B5563]")} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.locked ? (
                  <span className="rounded-[5px] border border-[#D8DDE5] bg-[#F3F5F8] px-1.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">Locked</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#DDE2EA] pt-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#303745] text-xs font-bold text-white">
              {setup.business.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BD"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#111827]">{setup.business.name}</p>
              <p className="truncate text-xs text-[#667085]">{setup.business.publicPhone ?? "Setup in progress"}</p>
            </div>
          </div>
          <Link href={readiness.testReady ? "/dashboard/test-center" : "/dashboard/answering-setup"} className="mt-4 inline-flex text-xs font-bold text-[#045BFF]">
            {readiness.testReady ? "Open Test Center" : "Open setup"}
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#D6DAE1] bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-[7px] bg-[#1565FF] text-[11px] font-bold text-white">SBA</span><span className="font-bold text-[#0F1115]">Answering</span></Link>
            <select value={items.find((item) => pathname.startsWith(item.href))?.href ?? "/dashboard/overview"} onChange={(event) => { window.location.href = event.target.value; }} className="rounded-[8px] border border-[#D6DAE1] bg-white px-3 py-2 text-xs font-semibold text-[#343A40]">
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
