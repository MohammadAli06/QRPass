import type { EventMode, QrDoc, QrState } from "@/types";

import { toDate } from "./format";

type QrLike = Pick<QrDoc, "status" | "used" | "validFrom" | "validUntil">;

/**
 * Verification order: revoked -> used (single-use) -> notYetValid -> expired
 * -> valid. Shared by the public verifier and the admin tables so both agree.
 */
export function getQrState(
  qr: QrLike,
  mode: EventMode,
  now: Date = new Date(),
): QrState {
  if (qr.status === "revoked") return "revoked";
  if (mode === "single-use" && qr.used) return "used";

  const from = toDate(qr.validFrom ?? null);
  const until = toDate(qr.validUntil ?? null);

  if (from && now.getTime() < from.getTime()) return "notYetValid";
  if (until && now.getTime() > until.getTime()) return "expired";

  return "valid";
}

export const QR_STATE_LABELS: Record<QrState, string> = {
  valid: "Active",
  expired: "Expired",
  notYetValid: "Not yet valid",
  revoked: "Revoked",
  used: "Used",
};
