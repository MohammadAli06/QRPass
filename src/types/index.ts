export type Tone = "success" | "warning" | "error" | "neutral";

export type DisplayState =
  | "valid"
  | "expired"
  | "notYetValid"
  | "revoked"
  | "used"
  | "invalid";

export type QrState = Exclude<DisplayState, "invalid">;

export type EventMode = "reusable" | "single-use";

export type EventStatus = "active" | "archived";

export type QrStatus = "active" | "revoked";

export interface DisplayContent {
  title: string;
  message: string;
  tone: Tone;
}

export type DisplayConfig = Record<DisplayState, DisplayContent>;

/**
 * Structural type shared by the client SDK `Timestamp` and the Admin SDK
 * `Timestamp` so the same models can be used on both sides.
 */
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

export interface EventDoc {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  startsAt?: TimestampLike | null;
  endsAt?: TimestampLike | null;
  status: EventStatus;
  defaultValidityHours: number;
  mode: EventMode;
  display: DisplayConfig;
  showFields: string[];
  createdAt?: TimestampLike | null;
  createdBy?: string;
  qrCount: number;
  scanCount: number;
}

export interface EventInput {
  name: string;
  description?: string;
  location?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  defaultValidityHours: number;
  mode: EventMode;
}

export interface QrDoc {
  token: string;
  eventId: string;
  name: string;
  email?: string | null;
  label?: string | null;
  meta: Record<string, string>;
  validFrom?: TimestampLike | null;
  validUntil?: TimestampLike | null;
  status: QrStatus;
  used: boolean;
  scanCount: number;
  firstScannedAt?: TimestampLike | null;
  lastScannedAt?: TimestampLike | null;
  createdAt?: TimestampLike | null;
}

export interface QrField {
  label: string;
  value: string;
}

export interface VerificationResult {
  state: DisplayState;
  display: DisplayContent;
  fields: QrField[];
  eventName: string | null;
}
