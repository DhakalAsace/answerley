"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck2,
  CreditCard,
  LayoutDashboard,
  Menu,
  PhoneCall,
  PhoneForwarded,
  Settings,
  SquareCheckBig,
  TestTube2,
  X,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
  const businessInitials = setup.business.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "BD";
  const setupHref = readiness.testReady ? "/dashboard/test-center" : "/dashboard/answering-setup";
  const setupLabel = readiness.testReady ? "Open Test Center" : "Open setup";

  const navLink = (item: (typeof items)[number], mode: "rail" | "drawer") => {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={mode === "drawer" ? () => setMobileNavOpen(false) : undefined}
        aria-label={item.locked ? `${item.label}, locked` : item.label}
        title={mode === "rail" ? item.label : undefined}
        className={cn(
          "group relative flex min-h-12 items-center rounded-[6px] text-sm font-medium transition",
          mode === "rail" ? "justify-center px-0 xl:justify-start xl:gap-3 xl:px-3" : "gap-3 px-3",
          active
            ? "bg-[#ECF3FF] text-[#045BFF]"
            : "text-[#111827] hover:bg-white hover:text-[#045BFF]",
        )}
      >
        <Icon className={cn("size-[19px] shrink-0", active ? "text-[#045BFF]" : "text-[#4B5563]")} />
        <span className={cn("min-w-0 flex-1 truncate", mode === "rail" ? "hidden xl:block" : "block")}>
          {item.label}
        </span>
        {item.locked ? (
          <>
            <span
              className={cn(
                "rounded-[5px] border border-[#D8DDE5] bg-[#F3F5F8] px-1.5 py-0.5 text-[11px] font-semibold text-[#6B7280]",
                mode === "rail" ? "hidden xl:inline-flex" : "inline-flex",
              )}
            >
              Locked
            </span>
            {mode === "rail" ? <span className="absolute right-2 top-2 hidden size-1.5 rounded-full bg-[#9CA3AF] md:block xl:hidden" /> : null}
          </>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFBFC] text-[#0F1115] md:grid md:grid-cols-[76px_1fr] xl:grid-cols-[252px_1fr]">
      <aside className="sticky top-0 hidden h-[100dvh] border-r border-[#D6DAE1] bg-[#FAFBFC] md:flex md:flex-col md:px-2 md:py-4 xl:px-4 xl:py-6">
        <Link href="/" className="flex items-center justify-center gap-3 px-1 pb-5 xl:justify-start xl:pb-6">
          <span className="flex size-10 items-center justify-center rounded-[8px] bg-[#1565FF] text-sm font-bold text-white shadow-[0_10px_22px_rgba(21,101,255,.22)]">SBA</span>
          <span className="hidden text-xl font-bold leading-none text-[#0F1115] xl:inline">Answering</span>
        </Link>
        <div className="h-px bg-[#DDE2EA]" />
        <div className="mt-4 hidden rounded-[10px] border border-[#E2E6ED] bg-white px-3 py-3 shadow-[0_12px_26px_rgba(15,17,21,.03)] xl:block">
          <p className="text-[11px] font-semibold uppercase text-[#727A87]">Business</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#111827]">{setup.business.name}</p>
          <p className="mt-2 text-xs font-semibold text-[#A05A00]">{readiness.statusLabel}</p>
        </div>
        <nav className="mt-4 space-y-1.5">
          {items.map((item) => navLink(item, "rail"))}
        </nav>
        <div className="mt-auto border-t border-[#DDE2EA] pt-4">
          <div className="flex items-center justify-center gap-3 xl:justify-start">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#303745] text-xs font-bold text-white">
              {businessInitials}
            </span>
            <div className="hidden min-w-0 xl:block">
              <p className="truncate text-sm font-semibold text-[#111827]">{setup.business.name}</p>
              <p className="truncate text-xs text-[#667085]">{setup.business.publicPhone ?? "Setup in progress"}</p>
            </div>
          </div>
          <Link href={setupHref} className="mt-4 hidden text-xs font-bold text-[#045BFF] xl:inline-flex">
            {setupLabel}
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#D6DAE1] bg-white/90 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-[7px] bg-[#1565FF] text-[11px] font-bold text-white">SBA</span>
              <span className="font-bold text-[#0F1115]">Answering</span>
            </Link>
            <button
              type="button"
              aria-label="Open dashboard navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-[8px] border border-[#D6DAE1] bg-white text-[#111827] shadow-[0_6px_14px_rgba(15,17,21,.05)] transition active:translate-y-px"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </header>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Dashboard navigation">
            <button
              type="button"
              aria-label="Close dashboard navigation"
              className="absolute inset-0 bg-[#0F1115]/35"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-[min(22rem,calc(100vw-24px))] flex-col border-r border-[#D6DAE1] bg-[#FAFBFC] px-4 py-4 shadow-[18px_0_50px_rgba(15,17,21,.18)]">
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-[8px] bg-[#1565FF] text-xs font-bold text-white">SBA</span>
                  <span className="font-bold text-[#0F1115]">Answering</span>
                </Link>
                <button
                  type="button"
                  aria-label="Close dashboard navigation"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-[8px] border border-[#D6DAE1] bg-white text-[#111827] transition active:translate-y-px"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-5 rounded-[10px] border border-[#E2E6ED] bg-white px-3 py-3 shadow-[0_12px_26px_rgba(15,17,21,.03)]">
                <p className="text-[11px] font-semibold uppercase text-[#727A87]">Business</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#111827]">{setup.business.name}</p>
                <p className="mt-2 text-xs font-semibold text-[#A05A00]">{readiness.statusLabel}</p>
              </div>
              <nav className="mt-4 space-y-1.5">
                {items.map((item) => navLink(item, "drawer"))}
              </nav>
              <div className="mt-auto border-t border-[#DDE2EA] pt-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#303745] text-xs font-bold text-white">
                    {businessInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{setup.business.name}</p>
                    <p className="truncate text-xs text-[#667085]">{setup.business.publicPhone ?? "Setup in progress"}</p>
                  </div>
                </div>
                <Link href={setupHref} onClick={() => setMobileNavOpen(false)} className="mt-4 inline-flex text-xs font-bold text-[#045BFF]">
                  {setupLabel}
                </Link>
              </div>
            </aside>
          </div>
        ) : null}

        {children}
        <SetupAssistantDock />
      </div>
    </div>
  );
}
