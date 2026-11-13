import JSZip from "jszip";

import { formatDateTime } from "./format";
import {
  buildVerifyUrl,
  downloadBlob,
  fileSafeName,
  mapWithConcurrency,
  qrDataUrl,
} from "./qr";
import type { EventDoc, QrDoc } from "@/types";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

async function createPdfBytes(
  qr: QrDoc,
  event: EventDoc,
  qrImage: string,
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(130);
  doc.text("QR PASS", PAGE_WIDTH / 2, 18, { align: "center" });

  doc.setFontSize(15);
  doc.setTextColor(20);
  const eventLines = doc.splitTextToSize(event.name || "Event", 170) as string[];
  let eventY = 27;
  for (const line of eventLines) {
    doc.text(line, PAGE_WIDTH / 2, eventY, { align: "center" });
    eventY += 7;
  }

  const qrSize = 105;
  const qrX = (PAGE_WIDTH - qrSize) / 2;
  const qrY = Math.max(eventY + 8, 45);
  doc.addImage(qrImage, "PNG", qrX, qrY, qrSize, qrSize);

  let y = qrY + qrSize + 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20);
  const nameLines = doc.splitTextToSize(qr.name, 170) as string[];
  for (const line of nameLines) {
    doc.text(line, PAGE_WIDTH / 2, y, { align: "center" });
    y += 8.5;
  }

  if (qr.label) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(qr.label, PAGE_WIDTH / 2, y, { align: "center" });
    y += 7;
  }

  y += 3;
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(40, y, PAGE_WIDTH - 40, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Valid until ${formatDateTime(qr.validUntil)}`, PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(120);
  const linkLines = doc.splitTextToSize(buildVerifyUrl(qr.token), 160) as string[];
  for (const line of linkLines) {
    doc.text(line, PAGE_WIDTH / 2, y, { align: "center" });
    y += 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Scan to verify this pass.", PAGE_WIDTH / 2, PAGE_HEIGHT - 16, {
    align: "center",
  });

  return doc.output("arraybuffer");
}

export async function downloadQrPdf(qr: QrDoc, event: EventDoc): Promise<void> {
  const image = await qrDataUrl(qr.token, { width: 1024 });
  const bytes = await createPdfBytes(qr, event, image);
  downloadBlob(
    new Blob([bytes], { type: "application/pdf" }),
    `${fileSafeName(qr.name, qr.token.slice(0, 8))}.pdf`,
  );
}

/**
 * One PDF per participant, bundled into a ZIP. Unzip and send each file to the
 * matching person.
 */
export async function downloadQrPdfZip(
  qrs: QrDoc[],
  event: EventDoc,
  zipName: string,
): Promise<void> {
  if (qrs.length === 0) return;

  const rendered = await mapWithConcurrency(qrs, 3, async (qr) => {
    const image = await qrDataUrl(qr.token, { width: 1024 });
    const bytes = await createPdfBytes(qr, event, image);
    return { qr, bytes };
  });

  const zip = new JSZip();
  const used = new Map<string, number>();

  for (const { qr, bytes } of rendered) {
    const base = fileSafeName(qr.name, qr.token.slice(0, 8));
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    zip.file(count === 1 ? `${base}.pdf` : `${base}-${count}.pdf`, bytes);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, zipName);
}
