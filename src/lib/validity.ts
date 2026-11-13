import { addHours } from "date-fns";

import { fromDateTimeLocal, toDateTimeLocal } from "./format";

export type ValidityPreset = "event" | "1d" | "2d" | "7d" | "30d" | "custom";

export const VALIDITY_PRESET_HOURS: Record<
  Exclude<ValidityPreset, "event" | "custom">,
  number
> = {
  "1d": 24,
  "2d": 48,
  "7d": 168,
  "30d": 720,
};

export interface ValidityResolution {
  validFrom: Date | null;
  validUntil: Date | null;
  error: string | null;
}

export function resolveValidity(
  preset: ValidityPreset,
  eventDefaultHours: number,
  customFrom: string,
  customUntil: string,
  now: Date = new Date(),
): ValidityResolution {
  if (preset === "custom") {
    const from = fromDateTimeLocal(customFrom);
    const until = fromDateTimeLocal(customUntil);
    if (!from) {
      return { validFrom: null, validUntil: null, error: "Choose a start date." };
    }
    if (!until) {
      return { validFrom: null, validUntil: null, error: "Choose an end date." };
    }
    if (until.getTime() <= from.getTime()) {
      return {
        validFrom: null,
        validUntil: null,
        error: "End must be after start.",
      };
    }
    return { validFrom: from, validUntil: until, error: null };
  }

  const hours =
    preset === "event" ? eventDefaultHours : VALIDITY_PRESET_HOURS[preset];

  if (!Number.isFinite(hours) || hours <= 0) {
    return {
      validFrom: null,
      validUntil: null,
      error: "Choose a validity window of at least one hour.",
    };
  }

  return { validFrom: now, validUntil: addHours(now, hours), error: null };
}

export function defaultCustomRange(hours: number): {
  from: string;
  until: string;
} {
  const now = new Date();
  return {
    from: toDateTimeLocal(now),
    until: toDateTimeLocal(addHours(now, Math.max(1, hours))),
  };
}
