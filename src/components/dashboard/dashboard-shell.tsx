"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CreditCard,
  Hash,
  MessageSquareText,
  PhoneCall,
  Settings,
  ShieldBan,
  Sparkles,
  SquareCheckBig,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app/calls", label: "Calls", icon: PhoneCall },
  { href: "/app/answering-plan", label: "Answering Plan", icon: BookOpenCheck },
  { href: "/app/requests", label: "Requests", icon: SquareCheckBig },
  { href: "/app/messages", label: "Messages", icon: MessageSquareText },
  { href: "/app/spam", label: "Spam", icon: ShieldBan },
  { href: "/app/numbers", label: "Numbers", icon: Hash },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-screen border-r border-slate-200 bg-white lg:flex lg:flex-col lg:p-4">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#17152a] text-white"><Sparkles className="size-4" /></span>
          <span className="text-lg font-bold tracking-tight text-slate-950">Answerley</span>
        </Link>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Business</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">Brightfield Services</p>
        </div>
        <nav className="mt-5 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-[#17152a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
                <Icon className="size-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-violet-50 p-4">
          <p className="text-sm font-semibold text-violet-900">Foundation workspace</p>
          <p className="mt-1 text-xs leading-5 text-violet-700">The standard dashboard shell is stable while the customer funnel can evolve.</p>
          <Link href="/dev/contract-health" className="mt-3 inline-flex text-xs font-bold text-violet-800">View contract health →</Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-[#17152a] text-white"><Sparkles className="size-3.5" /></span><span className="font-bold text-slate-950">Answerley</span></Link>
            <select value={items.find((item) => pathname.startsWith(item.href))?.href ?? "/app/calls"} onChange={(event) => { window.location.href = event.target.value; }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              {items.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
            </select>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
