"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHours } from "@/lib/constants";
import { subscribeEvent } from "@/lib/firestore/events";
import { subscribeQrs } from "@/lib/firestore/qrs";
import { formatDateTime } from "@/lib/format";
import { fileSafeName, mapWithConcurrency, qrDataUrl } from "@/lib/qr";
import { downloadQrPdfZip } from "@/lib/qr-pdf";
import type { EventDoc, QrDoc } from "@/types";

export function PrintSheet({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [qrs, setQrs] = useState<QrDoc[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeEvent(
      eventId,
      (next) => {
        setEvent(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [eventId]);

  useEffect(() => {
    const unsubscribe = subscribeQrs(eventId, (next) => setQrs(next), () => undefined);
    return unsubscribe;
  }, [eventId]);

  useEffect(() => {
    if (qrs.length === 0) {
      setImages({});
      return;
    }
    let cancelled = false;
    void mapWithConcurrency(qrs, 4, async (qr) => ({
      token: qr.token,
      dataUrl: await qrDataUrl(qr.token, { width: 512 }),
    }))
      .then((rendered) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const entry of rendered) next[entry.token] = entry.dataUrl;
        setImages(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [qrs]);

  const imagesReady = qrs.length > 0 && qrs.every((qr) => Boolean(images[qr.token]));

  async function handleDownloadPdfs() {
    if (!event || qrs.length === 0) return;
    setPdfBusy(true);
    try {
      await downloadQrPdfZip(
        qrs,
        event,
        `${fileSafeName(event.name, "event")}-pdf-passes.zip`,
      );
      toast.success("Individual PDF passes downloaded");
    } catch {
      toast.error("Could not generate the PDF passes");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="no-print flex flex-col gap-2 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/events/${eventId}`}>
              <ArrowLeft aria-hidden="true" />
              Back to event
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {qrs.length} {qrs.length === 1 ? "pass" : "passes"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDownloadPdfs()}
              disabled={pdfBusy || loading || qrs.length === 0}
            >
              {pdfBusy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <FileText aria-hidden="true" />
              )}
              {pdfBusy ? "Preparing PDFs…" : "Download PDFs (ZIP)"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => window.print()}
              disabled={loading || qrs.length === 0 || !imagesReady}
            >
              {qrs.length > 0 && !imagesReady ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Printer aria-hidden="true" />
              )}
              Print all
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Print all</strong> produces a
          grid for the whole event.{" "}
          <strong className="font-medium text-foreground">Download PDFs</strong> creates
          one PDF per participant inside a ZIP, ready to send to each person.
        </p>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight print:text-lg">
          {event?.name ?? "Event"}
        </h1>
        <p className="text-xs text-muted-foreground print:text-black">
          {event
            ? `${formatHours(event.defaultValidityHours || 48)} default validity · ${
                event.mode === "single-use" ? "Single-use" : "Reusable"
              }`
            : ""}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-56 w-full" />
          ))}
        </div>
      ) : qrs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center print:border-0">
          <h2 className="text-sm font-medium">No passes to print</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate passes for this event first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {qrs.map((qr) => (
            <div
              key={qr.token}
              className="print-card break-inside-avoid rounded-lg border p-3 text-center print:border-neutral-300 print:bg-white print:p-2 print:text-black"
            >
              <div className="mx-auto flex aspect-square w-full max-w-40 items-center justify-center rounded bg-white p-1 print:max-w-36">
                {images[qr.token] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[qr.token]}
                    alt={`QR code for ${qr.name}`}
                    className="size-full"
                    width={512}
                    height={512}
                  />
                ) : (
                  <div className="size-full animate-pulse rounded bg-muted print:bg-neutral-100" />
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium print:text-xs">
                {qr.name}
              </p>
              {qr.label && (
                <p className="truncate text-xs text-muted-foreground print:text-[10px] print:text-neutral-600">
                  {qr.label}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground print:text-neutral-600">
                Valid until {formatDateTime(qr.validUntil)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
