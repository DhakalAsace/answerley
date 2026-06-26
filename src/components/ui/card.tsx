import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/80 bg-white shadow-[0_10px_26px_rgba(15,23,42,.045)]",
        className,
      )}
      {...props}
    />
  );
}
