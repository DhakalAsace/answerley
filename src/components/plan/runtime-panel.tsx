"use client";

import { useState } from "react";
import { AlertTriangle, Braces, CheckCircle2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import type { LiveRuntimePack } from "@/domain/answering-plan/runtime/schema";

export function RuntimePanel({
  runtime,
  loading,
  compiler,
}: {
  runtime: LiveRuntimePack | null;
  loading: boolean;
  compiler: string;
}) {
  const [tab, setTab] = useState<"layers" | "tools" | "coverage" | "instruction">("layers");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Braces className="size-4 text-violet-600" />
            <h2 className="font-semibold text-slate-900">Gemini Live runtime</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Derived from this exact plan revision. It is never the source of truth.
          </p>
        </div>
        <Badge tone={loading ? "warning" : "success"}>
          {loading ? "Compiling" : compiler || "Ready"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
        {(["layers", "tools", "coverage", "instruction"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? "secondary" : "ghost"}
            onClick={() => setTab(item)}
            className={tab === item ? "bg-white shadow-sm" : ""}
          >
            {item === "instruction" ? "Full instruction" : item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>

      <div className="p-5">
        {!runtime && (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Runtime preview will appear after the plan compiles.
          </div>
        )}

        {runtime && tab === "layers" && (
          <div className="space-y-3">
            {Object.entries(runtime.layers).map(([key, value]) => (
              <details key={key} className="group rounded-xl border border-slate-200 bg-white p-4" open={key === "identity" || key === "groundingRules"}>
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                  {key.replace(/([a-z])([A-Z])/g, "$1 $2")}
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value}</p>
              </details>
            ))}
          </div>
        )}

        {runtime && tab === "tools" && (
          <div className="space-y-3">
            {runtime.tools.map((tool) => (
              <div key={tool.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-violet-600" />
                    <span className="font-mono text-sm font-semibold text-slate-900">{tool.name}</span>
                  </div>
                  <Badge tone="neutral">{tool.mode}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{tool.description}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  <strong>Invoke when:</strong> {tool.invocationCondition}
                </p>
              </div>
            ))}
          </div>
        )}

        {runtime && tab === "coverage" && (
          <div className="space-y-4">
            {Object.entries(runtime.coverage).map(([category, ids]) => (
              <div key={category} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    {category.replace(/Ids$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{ids.join(", ") || "No enabled items"}</p>
                </div>
                <Badge tone="success">{ids.length}</Badge>
              </div>
            ))}
            {runtime.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="size-4" />
                  Compilation warnings
                </div>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {runtime.warnings.map((warning) => (
                    <li key={`${warning.code}-${warning.planPath}`}>• {warning.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {runtime && tab === "instruction" && <CodeBlock value={runtime.systemInstruction} />}
      </div>
    </Card>
  );
}
