"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarClock,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExtendValidityDialog } from "@/components/qr/extend-validity-dialog";
import { GenerateQrsDialog } from "@/components/qr/generate-qrs-dialog";
import { QrEditDialog } from "@/components/qr/qr-edit-dialog";
import { QrPreviewDialog } from "@/components/qr/qr-preview-dialog";
import { QrStateBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteQr,
  deleteQrs,
  setManyQrStatus,
  setQrStatus,
} from "@/lib/firestore/qrs";
import { errorMessage } from "@/lib/firestore/helpers";
import { formatDateTime } from "@/lib/format";
import { QR_STATE_LABELS, getQrState } from "@/lib/qr-status";
import {
  buildQrCsv,
  buildVerifyUrl,
  downloadCsv,
  downloadQrPng,
  downloadQrZip,
  fileSafeName,
} from "@/lib/qr";
import type { EventDoc, QrDoc, QrState } from "@/types";

type StateFilter = QrState | "all";

interface QrCodesTabProps {
  event: EventDoc;
  qrs: QrDoc[];
  loading: boolean;
}

export function QrCodesTab({ event, qrs, loading }: QrCodesTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [extendToken, setExtendToken] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QrDoc | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      qrs.map((qr) => ({
        qr,
        state: getQrState(qr, event.mode, now),
      })),
    [qrs, event.mode, now],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(({ qr, state }) => {
      if (stateFilter !== "all" && state !== stateFilter) return false;
      if (!term) return true;
      return (
        qr.name.toLowerCase().includes(term) ||
        (qr.email ?? "").toLowerCase().includes(term) ||
        (qr.label ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search, stateFilter]);

  const selectedQrs = useMemo(
    () => qrs.filter((qr) => selected.has(qr.token)),
    [qrs, selected],
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every(({ qr }) => selected.has(qr.token));
  const previewQr = qrs.find((qr) => qr.token === previewToken) ?? null;
  const editQr = qrs.find((qr) => qr.token === editToken) ?? null;
  const extendQr = qrs.find((qr) => qr.token === extendToken) ?? null;

  function toggleOne(token: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        filtered.forEach(({ qr }) => next.delete(qr.token));
      } else {
        filtered.forEach(({ qr }) => next.add(qr.token));
      }
      return next;
    });
  }

  async function copyLink(qr: QrDoc) {
    try {
      await navigator.clipboard.writeText(buildVerifyUrl(qr.token));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  async function downloadPng(qr: QrDoc) {
    try {
      await downloadQrPng(qr.token, qr.name);
    } catch {
      toast.error("Could not download the QR code");
    }
  }

  async function toggleRevoked(qr: QrDoc) {
    try {
      await setQrStatus(qr.token, qr.status === "revoked" ? "active" : "revoked");
      toast.success(qr.status === "revoked" ? "Pass restored" : "Pass revoked");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the pass"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteQr(deleteTarget.token, event.id);
      toast.success("Pass deleted");
      setSelected((previous) => {
        const next = new Set(previous);
        next.delete(deleteTarget.token);
        return next;
      });
      setDeleteTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete the pass"));
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkRevoke() {
    if (selectedQrs.length === 0) return;
    setBusy(true);
    try {
      await setManyQrStatus(
        selectedQrs.map((qr) => qr.token),
        "revoked",
      );
      toast.success(
        `${selectedQrs.length} ${selectedQrs.length === 1 ? "pass" : "passes"} revoked`,
      );
      setSelected(new Set());
    } catch (error) {
      toast.error(errorMessage(error, "Could not revoke the passes"));
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedQrs.length === 0) return;
    setBusy(true);
    try {
      await deleteQrs(
        selectedQrs.map((qr) => qr.token),
        event.id,
      );
      toast.success(
        `${selectedQrs.length} ${selectedQrs.length === 1 ? "pass" : "passes"} deleted`,
      );
      setBulkDeleteOpen(false);
      setSelected(new Set());
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete the passes"));
    } finally {
      setBusy(false);
    }
  }

  async function handleZip() {
    if (selectedQrs.length === 0) return;
    setZipBusy(true);
    try {
      await downloadQrZip(
        selectedQrs.map((qr) => ({ token: qr.token, name: qr.name })),
        `${fileSafeName(event.name, "event")}-passes.zip`,
      );
      toast.success("ZIP downloaded");
    } catch {
      toast.error("Could not build the ZIP file");
    } finally {
      setZipBusy(false);
    }
  }

  function handleExportCsv() {
    const exportRows = (selectedQrs.length > 0 ? selectedQrs : filtered.map(({ qr }) => qr)).map(
      (qr) => ({
        name: qr.name,
        email: qr.email ?? "",
        label: qr.label ?? "",
        link: buildVerifyUrl(qr.token),
        validUntil: formatDateTime(qr.validUntil),
        status: QR_STATE_LABELS[getQrState(qr, event.mode)],
      }),
    );
    if (exportRows.length === 0) {
      toast.error("There are no passes to export");
      return;
    }
    downloadCsv(
      `${fileSafeName(event.name, "event")}-passes.csv`,
      buildQrCsv(exportRows),
    );
    toast.success("CSV exported");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-full max-w-xs" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="space-y-2 rounded-xl border p-3">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or label…"
            aria-label="Search passes"
            className="pl-8"
          />
        </div>
        <Select
          value={stateFilter}
          onValueChange={(value) => setStateFilter(value as StateFilter)}
        >
          <SelectTrigger aria-label="Filter passes by status" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="valid">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="notYetValid">Not yet valid</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="used">Used</SelectItem>
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <Button onClick={() => setGenerateOpen(true)} className="w-full sm:w-auto">
            <Plus aria-hidden="true" />
            Generate QRs
          </Button>
        </div>
      </div>

      {selectedQrs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="mr-1 text-xs font-medium">
            {selectedQrs.length} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleZip()}
            disabled={zipBusy || busy}
          >
            {zipBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileArchive aria-hidden="true" />
            )}
            Download ZIP
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={busy}>
            <FileDown aria-hidden="true" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleBulkRevoke()}
            disabled={busy}
          >
            <Ban aria-hidden="true" />
            Revoke
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={busy}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            className="sm:ml-auto"
          >
            Clear
          </Button>
        </div>
      )}

      {qrs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted">
            <QrCode className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-sm font-medium">No passes yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Generate single passes, paste a list of names, or import a CSV file.
          </p>
          <Button className="mt-4" onClick={() => setGenerateOpen(true)}>
            <Plus aria-hidden="true" />
            Generate QRs
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-sm font-medium">No matching passes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search term or status filter.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisible}
                    aria-label="Select all visible passes"
                  />
                </TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Scans</TableHead>
                <TableHead className="w-10 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ qr, state }) => (
                <TableRow key={qr.token} data-state={selected.has(qr.token) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(qr.token)}
                      onCheckedChange={() => toggleOne(qr.token)}
                      aria-label={`Select pass for ${qr.name}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-56">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{qr.name}</p>
                      {qr.email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {qr.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-40">
                    {qr.label ? (
                      <span className="inline-block max-w-full truncate text-xs">
                        {qr.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <QrStateBadge state={state} label={QR_STATE_LABELS[state]} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(qr.validUntil)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {qr.scanCount ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${qr.name}`}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setPreviewToken(qr.token)}>
                          <Eye aria-hidden="true" />
                          View QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void copyLink(qr)}>
                          <Copy aria-hidden="true" />
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void downloadPng(qr)}>
                          <Download aria-hidden="true" />
                          Download PNG
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setExtendToken(qr.token)}>
                          <CalendarClock aria-hidden="true" />
                          Extend validity
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditToken(qr.token)}>
                          <Pencil aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void toggleRevoked(qr)}>
                          {qr.status === "revoked" ? (
                            <RotateCcw aria-hidden="true" />
                          ) : (
                            <Ban aria-hidden="true" />
                          )}
                          {qr.status === "revoked" ? "Restore" : "Revoke"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget(qr)}
                        >
                          <Trash2 aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <GenerateQrsDialog
        event={event}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onCreated={(tokens) => {
          if (tokens.length === 1 && tokens[0]) setPreviewToken(tokens[0]);
        }}
      />

      <QrPreviewDialog
        event={event}
        qr={previewQr}
        open={Boolean(previewQr)}
        onOpenChange={(open) => {
          if (!open) setPreviewToken(null);
        }}
      />

      <QrEditDialog
        qr={editQr}
        open={Boolean(editQr)}
        onOpenChange={(open) => {
          if (!open) setEditToken(null);
        }}
      />

      <ExtendValidityDialog
        qr={extendQr}
        open={Boolean(extendQr)}
        onOpenChange={(open) => {
          if (!open) setExtendToken(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this pass?"
        description={
          deleteTarget
            ? `${deleteTarget.name}'s pass and its scan history will be permanently deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete pass"
        destructive
        busy={busy}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected passes?"
        description={`${selectedQrs.length} ${
          selectedQrs.length === 1 ? "pass" : "passes"
        } and their scan history will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete passes"
        destructive
        busy={busy}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
