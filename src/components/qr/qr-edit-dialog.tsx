"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
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
import { errorMessage } from "@/lib/firestore/helpers";
import { updateQrDetails } from "@/lib/firestore/qrs";
import { qrInputSchema } from "@/lib/schemas";
import type { QrDoc } from "@/types";

interface MetaRow {
  key: string;
  value: string;
}

interface QrEditDialogProps {
  qr: QrDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrEditDialog({ qr, open, onOpenChange }: QrEditDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !qr) return;
    setName(qr.name ?? "");
    setEmail(qr.email ?? "");
    setLabel(qr.label ?? "");
    setMetaRows(
      Object.entries(qr.meta ?? {}).map(([key, value]) => ({ key, value })),
    );
    setError(null);
    setBusy(false);
  }, [open, qr]);

  if (!qr) return null;

  async function handleSave() {
    if (!qr) return;
    setError(null);

    const meta: Record<string, string> = {};
    for (const row of metaRows) {
      const key = row.key.trim();
      const value = row.value.trim();
      if (key && value) meta[key] = value;
    }

    const parsed = qrInputSchema.safeParse({ name, email, label, meta });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the pass details.");
      return;
    }

    setBusy(true);
    try {
      await updateQrDetails(qr.token, {
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        label: parsed.data.label || undefined,
        meta: parsed.data.meta ?? {},
      });
      toast.success("Pass updated");
      onOpenChange(false);
    } catch (updateError) {
      setError(errorMessage(updateError, "Could not update this pass"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit pass</DialogTitle>
          <DialogDescription>
            Update participant details. The link and validity stay the same.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Participant name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom fields</Label>
            {metaRows.length === 0 && (
              <p className="text-xs text-muted-foreground">No custom fields.</p>
            )}
            {metaRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={row.key}
                  onChange={(event) => {
                    const next = [...metaRows];
                    next[index] = { ...row, key: event.target.value };
                    setMetaRows(next);
                  }}
                  placeholder="key"
                  aria-label={`Custom field ${index + 1} key`}
                />
                <Input
                  value={row.value}
                  onChange={(event) => {
                    const next = [...metaRows];
                    next[index] = { ...row, value: event.target.value };
                    setMetaRows(next);
                  }}
                  placeholder="value"
                  aria-label={`Custom field ${index + 1} value`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMetaRows(metaRows.filter((_, i) => i !== index))}
                  aria-label={`Remove custom field ${index + 1}`}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMetaRows([...metaRows, { key: "", value: "" }])}
            >
              <Plus aria-hidden="true" />
              Add field
            </Button>
          </div>

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
          <Button type="button" onClick={() => void handleSave()} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
