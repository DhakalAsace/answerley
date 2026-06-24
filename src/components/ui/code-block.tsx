import { cn } from "@/lib/utils";

export function CodeBlock({ value, className }: { value: string; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-[620px] overflow-auto rounded-2xl bg-[#12111f] p-4 text-xs leading-6 text-slate-200 shadow-inner",
        className,
      )}
    >
      <code>{value}</code>
    </pre>
  );
}
