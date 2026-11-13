import JSZip from "jszip";
import Papa from "papaparse";
import * as QRCode from "qrcode";

import { getAppUrl } from "./format";

export const QR_ERROR_CORRECTION = "M" as const;

export interface QrRenderOptions {
  width?: number;
  margin?: number;
  dark?: string;
  light?: string;
}

export function buildVerifyUrl(token: string): string {
  return `${getAppUrl()}/v/${token}`;
}

export async function qrDataUrl(
  token: string,
  options: QrRenderOptions = {},
): Promise<string> {
  return QRCode.toDataURL(buildVerifyUrl(token), {
    errorCorrectionLevel: QR_ERROR_CORRECTION,
    width: options.width ?? 1024,
    margin: options.margin ?? 2,
    color: {
      dark: options.dark ?? "#111111",
      light: options.light ?? "#ffffff",
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function fileSafeName(value: string, fallback = "pass"): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const base = cleaned || fallback;
  return base.slice(0, 60);
}

export async function downloadQrPng(token: string, name: string): Promise<void> {
  const dataUrl = await qrDataUrl(token, { width: 1024 });
  downloadDataUrl(dataUrl, `${fileSafeName(name, token.slice(0, 8))}.png`);
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        const item = items[index];
        if (item === undefined) return;
        results[index] = await mapper(item, index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function downloadQrZip(
  items: { token: string; name: string }[],
  zipName: string,
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  const rendered = await mapWithConcurrency(items, 6, async (item) => ({
    name: item.name,
    token: item.token,
    dataUrl: await qrDataUrl(item.token, { width: 1024 }),
  }));

  const used = new Map<string, number>();
  for (const entry of rendered) {
    const base = fileSafeName(entry.name, entry.token.slice(0, 8));
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const filename = count === 1 ? `${base}.png` : `${base}-${count}.png`;
    const base64 = entry.dataUrl.split(",")[1] ?? "";
    zip.file(filename, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, zipName);
}

export interface QrCsvRow {
  name: string;
  email: string;
  label: string;
  link: string;
  validUntil: string;
  status: string;
}

export function buildQrCsv(rows: QrCsvRow[]): string {
  return Papa.unparse(rows, {
    columns: ["name", "email", "label", "link", "validUntil", "status"],
    newline: "\r\n",
  });
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, filename);
}

export interface ParsedQrRow {
  name: string;
  email?: string;
  label?: string;
  meta: Record<string, string>;
}

export interface CsvParseResult {
  rows: ParsedQrRow[];
  metaKeys: string[];
  skipped: number;
  error?: string;
}

const RESERVED_COLUMNS = new Set(["name", "email", "label"]);

export function parseQrCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
  });

  const fields = (parsed.meta.fields ?? []).map((field) =>
    field.trim().toLowerCase(),
  );

  if (!fields.includes("name")) {
    return {
      rows: [],
      metaKeys: [],
      skipped: 0,
      error: "CSV must include a `name` column.",
    };
  }

  const rows: ParsedQrRow[] = [];
  const metaKeys = new Set<string>();
  let skipped = 0;

  for (const raw of parsed.data) {
    const normalised: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalised[key.trim().toLowerCase()] = (value ?? "").toString().trim();
    }

    const name = normalised.name ?? "";
    if (!name) {
      skipped += 1;
      continue;
    }

    const email = normalised.email ?? "";
    const label = normalised.label ?? "";
    const meta: Record<string, string> = {};

    for (const [key, value] of Object.entries(raw)) {
      const trimmedKey = key.trim();
      const trimmedValue = (value ?? "").toString().trim();
      if (!trimmedKey || !trimmedValue) continue;
      if (RESERVED_COLUMNS.has(trimmedKey.toLowerCase())) continue;
      meta[trimmedKey] = trimmedValue;
      metaKeys.add(trimmedKey);
    }

    rows.push({
      name,
      email: email || undefined,
      label: label || undefined,
      meta,
    });
  }

  if (rows.length === 0 && parsed.errors.length > 0) {
    return {
      rows: [],
      metaKeys: [],
      skipped,
      error: parsed.errors[0]?.message ?? "Could not parse this CSV file.",
    };
  }

  return { rows, metaKeys: [...metaKeys], skipped };
}
