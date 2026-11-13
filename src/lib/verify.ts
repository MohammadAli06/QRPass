import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  DEFAULT_DISPLAY,
  DEFAULT_SHOW_FIELDS,
} from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import { getQrState } from "@/lib/qr-status";
import { tokenSchema } from "@/lib/schemas";
import type {
  DisplayConfig,
  DisplayContent,
  DisplayState,
  EventDoc,
  QrDoc,
  VerificationResult,
} from "@/types";

import { buildDisplayFields } from "./verify-fields";

/**
 * Link-preview crawlers open URLs when a message is composed. Counting those
 * as scans - or worse, burning a single-use pass - would be wrong, so all
 * writes are skipped for these user agents. Trade-off: a real scan performed
 * inside an in-app browser that identifies itself as a bot is not counted.
 */
const BOT_PATTERN =
  /(bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|linkedinbot|skype|embedly|pinterest|vkshare|redditbot|applebot|bingpreview|google-inspectiontool|zalo|line\/)/i;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent);
}

export const ERROR_DISPLAY: DisplayContent = {
  title: "Unable to verify",
  message: "Something went wrong while checking this pass. Please try again in a moment.",
  tone: "neutral",
};

export function resolveDisplay(
  display: DisplayConfig | null | undefined,
  state: DisplayState,
): DisplayContent {
  const fallback = DEFAULT_DISPLAY[state];
  const candidate = display?.[state];
  if (!candidate) return fallback;
  return {
    title: candidate.title?.trim() || fallback.title,
    message: candidate.message?.trim() || fallback.message,
    tone: candidate.tone ?? fallback.tone,
  };
}

export function invalidResult(eventName: string | null = null): VerificationResult {
  return {
    state: "invalid",
    display: DEFAULT_DISPLAY.invalid,
    fields: [],
    eventName,
  };
}

export function errorResult(): VerificationResult {
  return {
    state: "invalid",
    display: ERROR_DISPLAY,
    fields: [],
    eventName: null,
  };
}

/**
 * Server-side verification. Runs in a transaction so the scan counters, the
 * single-use flag and the scan history stay consistent under concurrency.
 */
export async function verifyToken(
  rawToken: string,
  userAgent: string | null,
): Promise<VerificationResult> {
  const parsedToken = tokenSchema.safeParse(rawToken);
  if (!parsedToken.success) return invalidResult();

  const db = getAdminDb();
  const qrRef = db.collection("qrs").doc(parsedToken.data);
  const now = Timestamp.now();
  const nowDate = now.toDate();
  const shouldRecord = !isBotUserAgent(userAgent);

  return db.runTransaction(async (transaction) => {
    const qrSnapshot = await transaction.get(qrRef);
    if (!qrSnapshot.exists) return invalidResult();

    const qr = { ...qrSnapshot.data(), token: qrSnapshot.id } as QrDoc;
    if (!qr.eventId) return invalidResult();

    const eventRef = db.collection("events").doc(qr.eventId);
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) return invalidResult();

    const event = {
      ...eventSnapshot.data(),
      id: eventSnapshot.id,
    } as EventDoc;

    const mode = event.mode === "single-use" ? "single-use" : "reusable";
    const state = getQrState(qr, mode, nowDate);
    const showFields = Array.isArray(event.showFields)
      ? event.showFields
      : DEFAULT_SHOW_FIELDS;

    const result: VerificationResult = {
      state,
      display: resolveDisplay(event.display, state),
      fields: buildDisplayFields(
        {
          name: qr.name,
          email: qr.email,
          label: qr.label,
          validUntil: qr.validUntil,
          meta: qr.meta ?? {},
        },
        showFields,
      ),
      eventName: showFields.includes("eventName") ? event.name ?? null : null,
    };

    if (shouldRecord) {
      const markUsed = mode === "single-use" && state === "valid" && !qr.used;
      transaction.update(qrRef, {
        scanCount: FieldValue.increment(1),
        lastScannedAt: now,
        ...(qr.firstScannedAt ? {} : { firstScannedAt: now }),
        ...(markUsed ? { used: true } : {}),
      });
      transaction.update(eventRef, { scanCount: FieldValue.increment(1) });
      transaction.set(qrRef.collection("scans").doc(), {
        scannedAt: now,
        result: state,
        userAgent: userAgent ?? null,
      });
    }

    return result;
  });
}
