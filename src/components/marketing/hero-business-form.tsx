"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Globe2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroBusinessForm() {
  const router = useRouter();
  const [business, setBusiness] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = business.trim();
    if (!value) return;
    router.push(`/try?business=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(23,21,42,.13)]">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Globe2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={business}
            onChange={(event) => setBusiness(event.target.value)}
            placeholder="Enter your website or search your business"
            aria-label="Website or business"
            className="h-14 border-0 pl-12 text-base shadow-none focus:ring-0"
          />
        </div>
        <Button type="submit" size="lg" className="h-14 rounded-xl sm:px-6" disabled={!business.trim()}>
          Hear Answerley <ArrowRight className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-2 pt-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><Search className="size-3.5" /> Website or business name</span>
        <span className="flex items-center gap-1.5"><Building2 className="size-3.5" /> No card required</span>
      </div>
    </form>
  );
}
