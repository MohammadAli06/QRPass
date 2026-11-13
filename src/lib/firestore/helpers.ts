/**
 * Remove `undefined` values recursively. Firestore rejects documents that
 * contain `undefined` unless `ignoreUndefinedProperties` is enabled.
 */
export function stripUndefined<T>(value: T): T {
  if (value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    typeof (value as { toDate?: unknown }).toDate !== "function"
  ) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      result[key] = stripUndefined(item);
    }
    return result as T;
  }

  return value;
}

/** Trim metadata keys and drop empty entries. */
export function sanitizeMeta(
  meta: Record<string, string> | undefined | null,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!meta) return result;
  for (const [rawKey, rawValue] of Object.entries(meta)) {
    const key = rawKey.trim();
    const value = (rawValue ?? "").toString().trim();
    if (!key || !value) continue;
    result[key] = value;
  }
  return result;
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
