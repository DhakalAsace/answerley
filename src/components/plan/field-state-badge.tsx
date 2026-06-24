import { Badge } from "@/components/ui/badge";
import type { DisplayFieldState } from "@/domain/answering-plan/selectors";
import { formatLabel } from "@/lib/utils";

const tones: Record<DisplayFieldState, Parameters<typeof Badge>[0]["tone"]> = {
  found: "info",
  recommended: "purple",
  user_provided: "neutral",
  confirmed: "success",
  needs_confirmation: "warning",
  missing: "danger",
  conflict: "danger",
  not_applicable: "neutral",
};

export function FieldStateBadge({ state }: { state: DisplayFieldState }) {
  return <Badge tone={tones[state]}>{formatLabel(state)}</Badge>;
}
