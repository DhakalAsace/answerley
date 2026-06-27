import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  MessageSquareText,
  PhoneCall,
  Route,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { HeroBusinessForm } from "@/components/marketing/hero-business-form";
import { product } from "@/lib/product";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-white">
      <header className="relative z-20 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#17152a] text-white"><Sparkles className="size-4" /></span>
            <span className="text-lg font-bold tracking-tight text-slate-950">{product.name}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <a href="#how-it-works" className="hover:text-slate-950">How it works</a>
            <a href="#capabilities" className="hover:text-slate-950">What it handles</a>
            <Link href="/dashboard/calls" className="hover:text-slate-950">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">Log in</button>
            <Link href="/try?business=example.com" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#17152a] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#292541]">Build setup <ArrowRight className="size-3.5" /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-5 pb-24 pt-20 sm:px-8 sm:pt-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_10%,rgba(109,93,252,.12),transparent_38rem)]" />
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
              <WandSparkles className="size-3.5" /> Approval-first answering service
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-7xl">
              Small business calls answered when you cannot pick up.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Enter your website or business name. Build an answering setup, test it, and go live only after you approve.
            </p>
            <HeroBusinessForm />
            <p className="mt-4 text-xs font-medium text-slate-400">Nothing goes live until you choose to connect real calls.</p>
          </div>
        </section>

        <section id="capabilities" className="border-y border-slate-100 bg-[#f8f9fc] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-600">One approved setup</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950">Calls, requests, alerts, and safety in one place.</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">The owner dashboard, browser test, and future live calls all use the same approved setup.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                [PhoneCall, "Answers calls", "Uses approved business information, hours, services, FAQs, and policies."],
                [CalendarCheck2, "Captures requests", "Collects caller details for messages, callbacks, appointment requests, and urgent needs."],
                [Route, "Routes important calls", "Routes urgent calls to owner, office, on-call, or backup contacts."],
                [MessageSquareText, "Sends owner alerts", "Prepares concise owner alerts and caller confirmations when configured."],
              ].map(([Icon, title, description]) => {
                const Component = Icon as typeof PhoneCall;
                return (
                  <div key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.04)]">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Component className="size-5" /></div>
                    <h3 className="mt-4 font-semibold text-slate-950">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{String(description)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-600">Approval-first setup</p>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-slate-950">From website to a tested answering setup.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">No long setup form. The owner sees the setup work first, updates missing information beside the call, then saves it.</p>
              <Link href="/try?business=example.com" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-violet-700">Build a setup <ArrowRight className="size-4" /></Link>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-[#17152a] p-3 shadow-2xl shadow-slate-900/20">
              <div className="rounded-[22px] bg-white p-6 sm:p-8">
                {[
                  ["1", "Enter the business", "Website or business name starts the experience."],
                  ["2", "Build the answering setup", "Website information becomes approved answers and call handling."],
                  ["3", "Test one browser call", "Suggested caller questions and visible outcomes guide the review."],
                  ["4", "Approve edits beside the call", "Changes update the same answering setup used later for live calls."],
                ].map(([number, title, text], index) => (
                  <div key={number} className={`flex gap-4 py-5 ${index < 3 ? "border-b border-slate-100" : ""}`}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700">{number}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                    </div>
                    <Check className="ml-auto mt-1 size-4 shrink-0 text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
