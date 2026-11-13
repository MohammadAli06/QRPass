import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { DisplayContent, QrField, Tone } from "@/types";

const TONE_STYLES: Record<
  Tone,
  { icon: LucideIcon; wrap: string }
> = {
  success: {
    icon: CheckCircle2,
    wrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: XCircle,
    wrap: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  neutral: {
    icon: Info,
    wrap: "bg-muted text-muted-foreground",
  },
};

interface VerificationCardProps {
  display: DisplayContent;
  fields: QrField[];
  eventName?: string | null;
  showBranding?: boolean;
  className?: string;
}

export function VerificationCard({
  display,
  fields,
  eventName,
  showBranding = true,
  className,
}: VerificationCardProps) {
  const tone = TONE_STYLES[display.tone] ?? TONE_STYLES.neutral;
  const Icon = tone.icon;

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xs",
        className,
      )}
      data-tone={display.tone}
    >
      {eventName && (
        <p className="mb-5 truncate text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {eventName}
        </p>
      )}

      <div
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-full",
          tone.wrap,
        )}
      >
        <Icon className="size-7" aria-hidden="true" />
      </div>

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-balance">
        {display.title}
      </h1>
      <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
        {display.message}
      </p>

      {fields.length > 0 && (
        <dl className="mt-6 divide-y rounded-xl border text-left">
          {fields.map((field) => (
            <div
              key={`${field.label}-${field.value}`}
              className="flex items-start justify-between gap-4 px-3.5 py-2.5"
            >
              <dt className="shrink-0 text-xs text-muted-foreground">
                {field.label}
              </dt>
              <dd className="min-w-0 text-right text-xs font-medium break-words">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {showBranding && (
        <p className="mt-6 text-[11px] text-muted-foreground">
          Powered by{" "}
          <Link
            href="/"
            className="font-medium underline-offset-2 hover:underline"
          >
            QR Pass
          </Link>
        </p>
      )}
    </div>
  );
}
