"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { VerificationCard } from "@/components/verify/verification-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_FIELD_PREFIX,
  DEFAULT_DISPLAY,
  DEFAULT_SHOW_FIELDS,
  DISPLAY_STATES,
  SHOW_FIELD_OPTIONS,
  TONE_OPTIONS,
  createDefaultDisplay,
} from "@/lib/constants";
import { updateEventDisplay } from "@/lib/firestore/events";
import { errorMessage } from "@/lib/firestore/helpers";
import { buildDisplayFields } from "@/lib/verify-fields";
import {
  displayConfigSchema,
  showFieldsSchema,
} from "@/lib/schemas";
import type {
  DisplayConfig,
  DisplayContent,
  DisplayState,
  EventDoc,
  QrDoc,
  Tone,
} from "@/types";

function cloneDisplay(display: DisplayConfig | undefined): DisplayConfig {
  const base = createDefaultDisplay();
  if (!display) return base;
  const merge = (state: DisplayState) => ({
    ...base[state],
    ...(display[state] ?? {}),
  });
  return {
    valid: merge("valid"),
    expired: merge("expired"),
    notYetValid: merge("notYetValid"),
    revoked: merge("revoked"),
    used: merge("used"),
    invalid: merge("invalid"),
  };
}

interface VerificationTabProps {
  event: EventDoc;
  qrs: QrDoc[];
}

export function VerificationTab({ event, qrs }: VerificationTabProps) {
  const [display, setDisplay] = useState<DisplayConfig>(() =>
    cloneDisplay(event.display),
  );
  const [showFields, setShowFields] = useState<string[]>(
    event.showFields?.length ? [...event.showFields] : [...DEFAULT_SHOW_FIELDS],
  );
  const [previewState, setPreviewState] = useState<DisplayState>("valid");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplay(cloneDisplay(event.display));
    setShowFields(
      event.showFields?.length ? [...event.showFields] : [...DEFAULT_SHOW_FIELDS],
    );
  }, [event.id, event.display, event.showFields]);

  const customMetaKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const qr of qrs) {
      for (const key of Object.keys(qr.meta ?? {})) keys.add(key);
    }
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [qrs]);

  const fieldOptions = [
    ...SHOW_FIELD_OPTIONS,
    ...customMetaKeys.map((key) => ({
      value: `${CUSTOM_FIELD_PREFIX}${key}`,
      label: `Custom: ${key}`,
    })),
  ];

  const sampleMeta: Record<string, string> = {};
  for (const key of customMetaKeys) {
    sampleMeta[key] = qrs.find((qr) => qr.meta?.[key])?.meta?.[key] ?? "Sample value";
  }

  const sampleQr = qrs[0];
  const previewFields = buildDisplayFields(
    {
      name: sampleQr?.name ?? "Alex Morgan",
      email: sampleQr?.email ?? "alex@example.com",
      label: sampleQr?.label ?? "VIP",
      validUntil: sampleQr?.validUntil ?? new Date(Date.now() + 48 * 60 * 60 * 1000),
      meta: sampleMeta,
    },
    showFields,
  );
  const previewEventName = showFields.includes("eventName") ? event.name : null;

  function updateEntry(state: DisplayState, patch: Partial<DisplayContent>) {
    setDisplay((previous) => ({
      ...previous,
      [state]: { ...previous[state], ...patch },
    }));
  }

  function toggleField(value: string) {
    setShowFields((previous) =>
      previous.includes(value)
        ? previous.filter((entry) => entry !== value)
        : [...previous, value],
    );
  }

  function resetAll() {
    setDisplay(cloneDisplay(DEFAULT_DISPLAY));
    setShowFields([...DEFAULT_SHOW_FIELDS]);
    setError(null);
  }

  async function handleSave() {
    setError(null);

    const parsedDisplay = displayConfigSchema.safeParse(display);
    if (!parsedDisplay.success) {
      const issue = parsedDisplay.error.issues[0];
      setError(
        issue
          ? `${issue.path.join(".")}: ${issue.message}`
          : "Check the verification page copy.",
      );
      return;
    }

    const parsedFields = showFieldsSchema.safeParse(showFields);
    if (!parsedFields.success) {
      setError("Check the visible fields.");
      return;
    }

    setSaving(true);
    try {
      await updateEventDisplay(event.id, parsedDisplay.data, parsedFields.data);
      toast.success("Verification page saved");
    } catch (saveError) {
      setError(errorMessage(saveError, "Could not save the verification page"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Status messages</CardTitle>
            <CardDescription>
              Choose what people see on the public page for each verification
              result.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DISPLAY_STATES.map(({ value, label }) => {
              const entry = display[value];
              return (
                <div key={value} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">{label}</h3>
                    <Select
                      value={entry.tone}
                      onValueChange={(tone) =>
                        updateEntry(value, { tone: tone as Tone })
                      }
                    >
                      <SelectTrigger
                        aria-label={`${label} tone`}
                        className="w-44"
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${value}-title`}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        Title
                      </Label>
                      <Input
                        id={`${value}-title`}
                        value={entry.title}
                        maxLength={80}
                        onChange={(event) =>
                          updateEntry(value, { title: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${value}-message`}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        Message
                      </Label>
                      <Textarea
                        id={`${value}-message`}
                        rows={2}
                        value={entry.message}
                        maxLength={300}
                        onChange={(event) =>
                          updateEntry(value, { message: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visible fields</CardTitle>
            <CardDescription>
              Only the selected details are shown on the public page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {fieldOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/40"
                  htmlFor={`field-${option.value}`}
                >
                  <Checkbox
                    id={`field-${option.value}`}
                    checked={showFields.includes(option.value)}
                    onCheckedChange={() => toggleField(option.value)}
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))}
            </div>
            {customMetaKeys.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Custom fields appear here automatically once passes with custom
                metadata exist.
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetAll}
            disabled={saving}
          >
            <RotateCcw aria-hidden="true" />
            Reset to defaults
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 lg:sticky lg:top-20">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Live preview</h2>
          <Select
            value={previewState}
            onValueChange={(value) => setPreviewState(value as DisplayState)}
          >
            <SelectTrigger aria-label="Preview state" className="w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center rounded-xl border border-dashed bg-muted/30 p-4">
          <VerificationCard
            display={display[previewState]}
            fields={previewFields}
            eventName={previewEventName}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Preview uses a sample participant.
        </p>
      </div>
    </div>
  );
}
