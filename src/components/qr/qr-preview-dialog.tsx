"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { QrStateBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { QR_STATE_LABELS, getQrState } from "@/lib/qr-status";
import { buildVerifyUrl, downloadQrPng, qrDataUrl } from "@/lib/qr";
import type { EventDoc, QrDoc } from "@/types";

interface QrPreviewDialogProps {
  event: EventDoc;
  qr: QrDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrPreviewDialog({
  event,
  qr,
  open,
  onOpenChange,
}: QrPreviewDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const token = qr?.token ?? null;

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoading(true);
    setDataUrl(null);
    setImageError(null);

    qrDataUrl(token, { width: 640 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImageError("Could not render this QR code.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, token]);

  if (!qr) return null;

  const state = getQrState(qr, event.mode);
  const link = buildVerifyUrl(qr.token);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  async function download() {
    if (!qr) return;
    setDownloading(true);
    try {
      await downloadQrPng(qr.token, qr.name);
    } catch {
      toast.error("Could not download the QR code");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR pass</DialogTitle>
          <DialogDescription className="truncate">
            {qr.name}
            {qr.label ? ` · ${qr.label}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <div className="flex size-60 items-center justify-center rounded-xl border bg-white p-3">
            {loading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : imageError ? (
              <p className="px-4 text-center text-xs text-destructive">{imageError}</p>
            ) : dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR code for ${qr.name}`}
                className="size-full"
                width={480}
                height={480}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <QrStateBadge state={state} label={QR_STATE_LABELS[state]} />
            <span className="text-xs text-muted-foreground">
              {qr.scanCount} scan{qr.scanCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <dl className="divide-y rounded-lg border text-xs">
          <div className="flex items-start justify-between gap-3 px-3 py-2">
            <dt className="text-muted-foreground">Valid until</dt>
            <dd className="text-right font-medium">{formatDateTime(qr.validUntil)}</dd>
          </div>
          {qr.email && (
            <div className="flex items-start justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="max-w-[70%] truncate text-right font-medium">{qr.email}</dd>
            </div>
          )}
          <div className="flex items-start justify-between gap-3 px-3 py-2">
            <dt className="shrink-0 text-muted-foreground">Link</dt>
            <dd className="max-w-[70%] truncate text-right font-mono text-[11px]">
              {link}
            </dd>
          </div>
        </dl>

        <DialogFooter>
          <Button variant="outline" onClick={() => void copyLink()}>
            <Copy aria-hidden="true" />
            Copy link
          </Button>
          <Button onClick={() => void download()} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
