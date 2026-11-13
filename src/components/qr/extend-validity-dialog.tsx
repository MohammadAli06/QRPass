"use client";

import { addDays } from "date-fns";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/firestore/helpers";
import { setQrValidityWindow } from "@/lib/firestore/qrs";
import { formatDateTime, fromDateTimeLocal, toDate, toDateTimeLocal } from "@/lib/format";
import type { QrDoc } from "@/types";

type ExtendMode = "1" | "2" | "7" | "30" | "custom";

const EXTEND_OPTIONS: { value: ExtendMode; label: string; days: number }[] = [
  { value: "1", label: "Add 1 day", days: 1 },
  { value: "2", label: "Add 2 days", days: 2 },
  { value: "7", label: "Add 7 days", days: 7 },
  { value: "30", label: "Add 30 days", days: 30 },
  { value: "custom", label: "Set a custom end date", days: 0 },
];

interface ExtendValidityDialogProps {
  qr: QrDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtendValidityDialog({
  qr,
  open,
  onOpenChange,
}: ExtendValidityDialogProps) {
  const [mode, setMode] = useState<ExtendMode>("2");
  const [customUntil, setCustomUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !qr) return;
    setMode("2");
    const currentUntil = toDate(qr.validUntil ?? null) ?? new Date();
    setCustomUntil(toDateTimeLocal(addDays(currentUntil, 2)));
    setError(null);
    setBusy(false);
  }, [open, qr]);

  if (!qr) return null;

  const currentFrom = toDate(qr.validFrom ?? null) ?? new Date();
  const currentUntil = toDate(qr.validUntil ?? null);

  function computeNewUntil(): Date | null {
    if (mode === "custom") return fromDateTimeLocal(customUntil);
    const option = EXTEND_OPTIONS.find((entry) => entry.value === mode);
    if (!option) return null;
    return addDays(currentUntil ?? new Date(), option.days);
  }

  async function handleApply() {
    if (!qr) return;
    setError(null);
    const newUntil = computeNewUntil();
    if (!newUntil) {
      setError("Choose a valid end date.");
      return;
    }
    if (newUntil.getTime() <= currentFrom.getTime()) {
      setError("The new end date must be after the start date.");
      return;
    }

    setBusy(true);
    try {
      await setQrValidityWindow(qr.token, {
        validFrom: currentFrom,
        validUntil: newUntil,
      });
      toast.success(`Validity extended to ${formatDateTime(newUntil)}`);
      onOpenChange(false);
    } catch (extendError) {
      setError(errorMessage(extendError, "Could not extend this pass"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extend validity</DialogTitle>
          <DialogDescription>
            Currently valid until {formatDateTime(qr.validUntil)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="extend-mode">Extend by</Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as ExtendMode)}
            >
              <SelectTrigger id="extend-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTEND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="extend-custom">New end date</Label>
              <Input
                id="extend-custom"
                type="datetime-local"
                value={customUntil}
                onChange={(event) => setCustomUntil(event.target.value)}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            New end date:{" "}
            <span className="font-medium text-foreground">
              {formatDateTime(computeNewUntil())}
            </span>
          </p>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleApply()} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Saving…" : "Extend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
