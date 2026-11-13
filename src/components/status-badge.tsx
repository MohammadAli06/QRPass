import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventStatus, QrState } from "@/types";

const QR_STATE_STYLES: Record<QrState, string> = {
  valid:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  expired:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  notYetValid:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  revoked: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  used: "border-border bg-muted text-muted-foreground",
};

const DOT_STYLES: Record<QrState, string> = {
  valid: "bg-emerald-500",
  expired: "bg-amber-500",
  notYetValid: "bg-sky-500",
  revoked: "bg-red-500",
  used: "bg-muted-foreground/60",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  if (status === "archived") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Archived
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      Active
    </Badge>
  );
}

export function QrStateBadge({
  state,
  label,
}: {
  state: QrState;
  label: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", QR_STATE_STYLES[state])}>
      <span
        className={cn("size-1.5 rounded-full", DOT_STYLES[state])}
        aria-hidden="true"
      />
      {label}
    </Badge>
  );
}
