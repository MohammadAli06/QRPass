import type { DisplayConfig, DisplayState, Tone } from "@/types";

export const DEFAULT_AUTH_EMAIL_DOMAIN = "qrpass.local";
export const DEFAULT_VALIDITY_HOURS = 48;

/** Upper bound for a single bulk generation request (UI-side guard). */
export const MAX_BULK_QR = 2000;

/** Firestore allows 500 writes per batch; keep a safety margin. */
export const FIRESTORE_BATCH_LIMIT = 400;

export const DISPLAY_STATES: { value: DisplayState; label: string }[] = [
  { value: "valid", label: "Valid" },
  { value: "expired", label: "Expired" },
  { value: "notYetValid", label: "Not yet valid" },
  { value: "revoked", label: "Revoked" },
  { value: "used", label: "Used" },
  { value: "invalid", label: "Invalid / not found" },
];

export const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "success", label: "Success (green)" },
  { value: "warning", label: "Warning (amber)" },
  { value: "error", label: "Error (red)" },
  { value: "neutral", label: "Neutral (gray)" },
];

export const DEFAULT_DISPLAY: DisplayConfig = {
  valid: {
    title: "Verified",
    message: "This pass is valid.",
    tone: "success",
  },
  expired: {
    title: "Pass expired",
    message: "This pass is no longer valid.",
    tone: "warning",
  },
  notYetValid: {
    title: "Not valid yet",
    message: "This pass becomes valid soon.",
    tone: "warning",
  },
  revoked: {
    title: "Pass revoked",
    message: "This pass was cancelled by the organizer.",
    tone: "error",
  },
  used: {
    title: "Already used",
    message: "This single-use pass has already been scanned.",
    tone: "neutral",
  },
  invalid: {
    title: "Pass not found",
    message: "We couldn't verify this pass. Check the link and try again.",
    tone: "neutral",
  },
};

export const DEFAULT_SHOW_FIELDS = ["eventName", "name", "label", "validUntil"];

export const SHOW_FIELD_OPTIONS = [
  { value: "eventName", label: "Event name" },
  { value: "name", label: "Participant name" },
  { value: "email", label: "Email" },
  { value: "label", label: "Label" },
  { value: "validUntil", label: "Valid until" },
];

export const CUSTOM_FIELD_PREFIX = "custom.";

export function createDefaultDisplay(): DisplayConfig {
  return {
    valid: { ...DEFAULT_DISPLAY.valid },
    expired: { ...DEFAULT_DISPLAY.expired },
    notYetValid: { ...DEFAULT_DISPLAY.notYetValid },
    revoked: { ...DEFAULT_DISPLAY.revoked },
    used: { ...DEFAULT_DISPLAY.used },
    invalid: { ...DEFAULT_DISPLAY.invalid },
  };
}

export function getAuthEmailDomain(): string {
  const value = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN?.trim();
  return value ? value.toLowerCase() : DEFAULT_AUTH_EMAIL_DOMAIN;
}

export function getValidityPresets(eventDefaultHours: number) {
  return [
    { value: "event", label: `Event default (${formatHours(eventDefaultHours)})` },
    { value: "1d", label: "1 day" },
    { value: "2d", label: "2 days" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "custom", label: "Custom range" },
  ];
}

export function formatHours(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
