"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  MapPin,
  Printer,
  QrCode,
  ScanLine,
  Settings,
} from "lucide-react";

import { SettingsTab } from "@/components/events/settings-tab";
import { VerificationTab } from "@/components/events/verification-tab";
import { QrCodesTab } from "@/components/qr/qr-codes-tab";
import { EventStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHours } from "@/lib/constants";
import { subscribeEvent } from "@/lib/firestore/events";
import { subscribeQrs } from "@/lib/firestore/qrs";
import { errorMessage } from "@/lib/firestore/helpers";
import { formatDate } from "@/lib/format";
import type { EventDoc, QrDoc } from "@/types";

export function EventDetail({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [qrs, setQrs] = useState<QrDoc[]>([]);
  const [qrsLoading, setQrsLoading] = useState(true);
  const [qrsError, setQrsError] = useState<string | null>(null);

  useEffect(() => {
    setEventLoading(true);
    const unsubscribe = subscribeEvent(
      eventId,
      (next) => {
        setEvent(next);
        setEventLoading(false);
        setEventError(null);
      },
      (error) => {
        setEventError(errorMessage(error, "Could not load this event"));
        setEventLoading(false);
      },
    );
    return unsubscribe;
  }, [eventId]);

  useEffect(() => {
    setQrsLoading(true);
    try {
      const unsubscribe = subscribeQrs(
        eventId,
        (next) => {
          setQrs(next);
          setQrsLoading(false);
          setQrsError(null);
        },
        (error) => {
          setQrsError(errorMessage(error, "Could not load passes"));
          setQrsLoading(false);
        },
      );
      return unsubscribe;
    } catch (error) {
      setQrsError(errorMessage(error, "Could not load passes"));
      setQrsLoading(false);
      return undefined;
    }
  }, [eventId]);

  if (eventLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (eventError) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h1 className="text-sm font-medium">Could not load this event</h1>
        <p className="mt-1 text-sm text-muted-foreground">{eventError}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin">
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h1 className="text-sm font-medium">Event not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin">
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {event.description?.trim() || "No description"}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <QrCode className="size-3.5" aria-hidden="true" />
              {event.qrCount ?? 0} passes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ScanLine className="size-3.5" aria-hidden="true" />
              {event.scanCount ?? 0} scans
            </span>
            <span>
              {event.mode === "single-use" ? "Single-use" : "Reusable"} ·{" "}
              {formatHours(event.defaultValidityHours || 48)} default validity
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                {event.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Created {formatDate(event.createdAt)}
            </span>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={`/admin/events/${event.id}/print`}>
            <Printer aria-hidden="true" />
            Print sheet
          </Link>
        </Button>
      </div>

      {qrsError && (
        <p role="alert" className="text-sm text-destructive">
          {qrsError}
        </p>
      )}

      <Tabs defaultValue="qrs" className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="qrs">
            <QrCode aria-hidden="true" />
            QR Codes
          </TabsTrigger>
          <TabsTrigger value="display">
            <Eye aria-hidden="true" />
            Verification Page
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings aria-hidden="true" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qrs">
          <QrCodesTab event={event} qrs={qrs} loading={qrsLoading} />
        </TabsContent>

        <TabsContent value="display">
          <VerificationTab event={event} qrs={qrs} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab event={event} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
