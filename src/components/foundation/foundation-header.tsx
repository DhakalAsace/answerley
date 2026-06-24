import Link from "next/link";
import { Braces, HeartPulse, PhoneCall, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Customer slice", icon: PhoneCall },
  { href: "/dev/answering-plan-lab", label: "Plan Lab", icon: Braces },
  { href: "/dev/contract-health", label: "Contract Health", icon: HeartPulse },
  { href: "/app/calls", label: "Calls dashboard", icon: Sparkles },
];

export function FoundationHeader({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#17152a] text-white shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-slate-950">Answerley</span>
            <span className="block text-[11px] font-medium text-slate-400">Foundation workspace</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 md:flex">
          {links.map((item) => {
            const Icon = item.icon;
            const current = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  current
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Visual-first
        </div>
      </div>
    </header>
  );
}
