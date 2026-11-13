import type { TimestampLike } from "@/types";

export function toDate(
  value: TimestampLike | Date | string | number | null | undefined,
): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value.toDate === "function") {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export function formatDateTime(
  value: TimestampLike | Date | string | number | null | undefined,
): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

export function formatDate(
  value: TimestampLike | Date | string | number | null | undefined,
): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Format a date for an `<input type="datetime-local">` value (local time). */
export function toDateTimeLocal(
  value: TimestampLike | Date | string | number | null | undefined,
): string {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Parse an `<input type="datetime-local">` value into a Date. */
export function fromDateTimeLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Absolute base URL used in QR codes. */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export function isBrandingHidden(): boolean {
  return process.env.NEXT_PUBLIC_HIDE_BRANDING === "true";
}
