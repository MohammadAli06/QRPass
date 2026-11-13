import type { QrField, TimestampLike } from "@/types";

import { CUSTOM_FIELD_PREFIX } from "./constants";
import { formatDateTime } from "./format";

export interface FieldSource {
  name?: string | null;
  email?: string | null;
  label?: string | null;
  validUntil?: TimestampLike | Date | string | null;
  eventName?: string | null;
  meta?: Record<string, string> | null;
}

function customFieldLabel(key: string): string {
  const cleaned = key.replace(/[_.-]+/g, " ").trim();
  if (!cleaned) return "Detail";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Build the ordered list of details shown on the public verification card. */
export function buildDisplayFields(
  source: FieldSource,
  showFields: string[],
): QrField[] {
  const fields: QrField[] = [];
  const seen = new Set<string>();

  for (const rawKey of showFields) {
    const key = rawKey.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (key === "eventName") {
      // Rendered as the small header above the card, not as a detail row.
      continue;
    }

    if (key === "name") {
      if (source.name) fields.push({ label: "Name", value: source.name });
      continue;
    }

    if (key === "email") {
      if (source.email) fields.push({ label: "Email", value: source.email });
      continue;
    }

    if (key === "label") {
      if (source.label) fields.push({ label: "Label", value: source.label });
      continue;
    }

    if (key === "validUntil") {
      if (source.validUntil) {
        fields.push({ label: "Valid until", value: formatDateTime(source.validUntil) });
      }
      continue;
    }

    if (key.startsWith(CUSTOM_FIELD_PREFIX)) {
      const metaKey = key.slice(CUSTOM_FIELD_PREFIX.length);
      const value = source.meta?.[metaKey];
      if (metaKey && value) {
        fields.push({ label: customFieldLabel(metaKey), value });
      }
    }
  }

  return fields;
}
