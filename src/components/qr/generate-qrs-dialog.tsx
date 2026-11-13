"use client";

import { useEffect, useState } from "react";
import { FileUp, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { ValidityRangeField } from "@/components/qr/validity-range-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MAX_BULK_QR } from "@/lib/constants";
import { errorMessage } from "@/lib/firestore/helpers";
import { createQrs, type NewQrInput } from "@/lib/firestore/qrs";
import {
  defaultCustomRange,
  resolveValidity,
  type ValidityPreset,
} from "@/lib/validity";
import { parseQrCsv, type ParsedQrRow } from "@/lib/qr";
import { qrInputSchema } from "@/lib/schemas";
import type { EventDoc } from "@/types";

type GenerateMode = "single" | "bulk" | "csv";

interface MetaRow {
  key: string;
  value: string;
}

interface CsvState {
  fileName: string;
  rows: ParsedQrRow[];
  metaKeys: string[];
  skipped: number;
}

interface GenerateQrsDialogProps {
  event: EventDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (tokens: string[]) => void;
}

function MetaRowsEditor({
  rows,
  onChange,
}: {
  rows: MetaRow[];
  onChange: (rows: MetaRow[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Custom fields</Label>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Optional. Add key/value pairs such as seat or ticket type.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, key: event.target.value };
              onChange(next);
            }}
            placeholder="key (e.g. seat)"
            aria-label={`Custom field ${index + 1} key`}
          />
          <Input
            value={row.value}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, value: event.target.value };
              onChange(next);
            }}
            placeholder="value (e.g. A12)"
            aria-label={`Custom field ${index + 1} value`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            aria-label={`Remove custom field ${index + 1}`}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { key: "", value: "" }])}
        disabled={rows.length >= 10}
      >
        <Plus aria-hidden="true" />
        Add field
      </Button>
    </div>
  );
}

export function GenerateQrsDialog({
  event,
  open,
  onOpenChange,
  onCreated,
}: GenerateQrsDialogProps) {
  const [mode, setMode] = useState<GenerateMode>("single");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [csv, setCsv] = useState<CsvState | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [preset, setPreset] = useState<ValidityPreset>("event");
  const [customFrom, setCustomFrom] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("single");
    setName("");
    setEmail("");
    setLabel("");
    setMetaRows([]);
    setBulkText("");
    setCsv(null);
    setCsvError(null);
    setPreset("event");
    const range = defaultCustomRange(event.defaultValidityHours || 48);
    setCustomFrom(range.from);
    setCustomUntil(range.until);
    setError(null);
    setBusy(false);
  }, [open, event.defaultValidityHours]);

  const bulkNames = bulkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const estimatedCount =
    mode === "single" ? 1 : mode === "bulk" ? bulkNames.length : csv?.rows.length ?? 0;

  const validity = resolveValidity(
    preset,
    event.defaultValidityHours || 48,
    customFrom,
    customUntil,
  );

  function collectInputs(): NewQrInput[] {
    if (mode === "single") {
      const meta: Record<string, string> = {};
      for (const row of metaRows) {
        const key = row.key.trim();
        const value = row.value.trim();
        if (key && value) meta[key] = value;
      }
      const parsed = qrInputSchema.safeParse({
        name,
        email,
        label,
        meta,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Check the participant details.");
      }
      return [
        {
          name: parsed.data.name,
          email: parsed.data.email || undefined,
          label: parsed.data.label || undefined,
          meta: parsed.data.meta ?? {},
        },
      ];
    }

    if (mode === "bulk") {
      if (bulkNames.length === 0) {
        throw new Error("Add at least one participant name.");
      }
      return bulkNames.map((participant, index) => {
        const parsed = qrInputSchema.safeParse({ name: participant });
        if (!parsed.success) {
          throw new Error(
            `Line ${index + 1}: ${parsed.error.issues[0]?.message ?? "Invalid name"}`,
          );
        }
        return { name: parsed.data.name };
      });
    }

    if (!csv || csv.rows.length === 0) {
      throw new Error("Import a CSV file with at least one row.");
    }

    return csv.rows.map((row, index) => {
      const parsed = qrInputSchema.safeParse({
        name: row.name,
        email: row.email ?? "",
        label: row.label ?? "",
        meta: row.meta,
      });
      if (!parsed.success) {
        throw new Error(
          `Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid row"}`,
        );
      }
      return {
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        label: parsed.data.label || undefined,
        meta: parsed.data.meta ?? {},
      };
    });
  }

  async function handleFile(file: File | undefined) {
    setCsvError(null);
    setCsv(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCsvError("That file is larger than 5 MB. Split it into smaller files.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseQrCsv(text);
      if (parsed.error) {
        setCsvError(parsed.error);
        return;
      }
      if (parsed.rows.length === 0) {
        setCsvError("No rows with a name were found in this file.");
        return;
      }
      setCsv({
        fileName: file.name,
        rows: parsed.rows,
        metaKeys: parsed.metaKeys,
        skipped: parsed.skipped,
      });
    } catch {
      setCsvError("Could not read that file.");
    }
  }

  async function handleGenerate() {
    setError(null);

    let inputs: NewQrInput[];
    try {
      inputs = collectInputs();
    } catch (inputError) {
      setError(errorMessage(inputError, "Check the pass details."));
      return;
    }

    if (inputs.length > MAX_BULK_QR) {
      setError(`Generate at most ${MAX_BULK_QR} passes at a time.`);
      return;
    }

    if (validity.error || !validity.validFrom || !validity.validUntil) {
      setError(validity.error ?? "Choose a valid window.");
      return;
    }

    setBusy(true);
    try {
      const tokens = await createQrs(event.id, inputs, {
        validFrom: validity.validFrom,
        validUntil: validity.validUntil,
      });
      toast.success(
        `${tokens.length} ${tokens.length === 1 ? "pass" : "passes"} created`,
      );
      onCreated(tokens);
      onOpenChange(false);
    } catch (generateError) {
      setError(errorMessage(generateError, "Could not generate passes"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate QR passes</DialogTitle>
          <DialogDescription>
            Passes are created for {event.name}. Each pass gets its own unguessable link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Tabs value={mode} onValueChange={(value) => setMode(value as GenerateMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="single">Single</TabsTrigger>
              <TabsTrigger value="bulk">Bulk names</TabsTrigger>
              <TabsTrigger value="csv">CSV import</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="qr-name">Participant name</Label>
                <Input
                  id="qr-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Morgan"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qr-email">Email</Label>
                  <Input
                    id="qr-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qr-label">Label</Label>
                  <Input
                    id="qr-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="VIP, Seat A12…"
                  />
                </div>
              </div>
              <MetaRowsEditor rows={metaRows} onChange={setMetaRows} />
            </TabsContent>

            <TabsContent value="bulk" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="qr-bulk">Participant names</Label>
                <Textarea
                  id="qr-bulk"
                  rows={7}
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  placeholder={"Alex Morgan\nSam Rivera\nJordan Lee"}
                />
                <p className="text-xs text-muted-foreground">
                  One name per line. {bulkNames.length} detected.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="qr-csv">CSV file</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="qr-csv"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      void handleFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required column: <code className="rounded bg-muted px-1">name</code>.
                  Optional: <code className="rounded bg-muted px-1">email</code>,{" "}
                  <code className="rounded bg-muted px-1">label</code>. Any other column
                  is stored as a custom field.
                </p>
              </div>

              {csvError && (
                <p role="alert" className="text-xs text-destructive">
                  {csvError}
                </p>
              )}

              {csv && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                  <p className="flex items-center gap-1.5 font-medium">
                    <FileUp className="size-3.5" aria-hidden="true" />
                    {csv.fileName}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {csv.rows.length} row{csv.rows.length === 1 ? "" : "s"} ready
                    {csv.skipped > 0 ? `, ${csv.skipped} skipped` : ""}
                    {csv.metaKeys.length > 0
                      ? ` · custom fields: ${csv.metaKeys.join(", ")}`
                      : ""}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <ValidityRangeField
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customUntil={customUntil}
            onCustomFromChange={setCustomFrom}
            onCustomUntilChange={setCustomUntil}
            eventDefaultHours={event.defaultValidityHours || 48}
            idPrefix="generate-validity"
          />

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {estimatedCount} {estimatedCount === 1 ? "pass" : "passes"} will be created
            </p>
            <p className="mt-1">
              {validity.error
                ? validity.error
                : `Valid ${validity.validFrom?.toLocaleString()} → ${validity.validUntil?.toLocaleString()}`}
            </p>
            <p className="mt-1">Mode: {event.mode === "single-use" ? "single-use" : "reusable"}</p>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleGenerate()} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Generating…" : `Generate ${estimatedCount || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
