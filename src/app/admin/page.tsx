"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  QrCode,
  ScanLine,
  Search,
  type LucideIcon,
} from "lucide-react";

import { EventStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeEvents } from "@/lib/firestore/events";
import { errorMessage } from "@/lib/firestore/helpers";
import { formatDate } from "@/lib/format";
import type { EventDoc } from "@/types";

type StatusFilter = "all" | "active" | "archived";

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function EventCard({ event }: { event: EventDoc }) {
  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="group flex flex-col rounded-xl border bg-card p-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-sm font-medium group-hover:underline group-hover:underline-offset-4">
            {event.name}
          </h2>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {event.description?.trim() || "No description"}
          </p>
        </div>
        <EventStatusBadge status={event.status} />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <QrCode className="size-3.5" aria-hidden="true" />
          {event.qrCount ?? 0} passes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ScanLine className="size-3.5" aria-hidden="true" />
          {event.scanCount ?? 0} scans
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatDate(event.createdAt)}
        </span>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <Skeleton key={key} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  useEffect(() => {
    const unsubscribe = subscribeEvents(
      (next) => {
        setEvents(next);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError, "Could not load events"));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const totals = useMemo(
    () =>
      events.reduce(
        (accumulator, event) => ({
          qrs: accumulator.qrs + (event.qrCount ?? 0),
          scans: accumulator.scans + (event.scanCount ?? 0),
        }),
        { qrs: 0, scans: 0 },
      ),
    [events],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      if (status !== "all" && event.status !== status) return false;
      if (!term) return true;
      return (
        event.name.toLowerCase().includes(term) ||
        (event.description ?? "").toLowerCase().includes(term) ||
        (event.location ?? "").toLowerCase().includes(term)
      );
    });
  }, [events, search, status]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            An overview of your events, passes and scans.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus aria-hidden="true" />
            New event
          </Link>
        </Button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Could not load events</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Events"
              value={events.length}
              icon={CalendarDays}
              hint="Across all statuses"
            />
            <StatCard
              label="QR passes"
              value={totals.qrs}
              icon={QrCode}
              hint="Issued in total"
            />
            <StatCard
              label="Scans"
              value={totals.scans}
              icon={ScanLine}
              hint="Verification page views"
            />
          </div>

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
                  placeholder="Search events…"
                  aria-label="Search events"
                  className="pl-8"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as StatusFilter)}
              >
                <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {(search || status !== "active") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatus("active");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted">
                  <CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <h2 className="mt-3 text-sm font-medium">No events yet</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Create an event to start issuing QR passes for your participants.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/admin/events/new">
                    <Plus aria-hidden="true" />
                    Create event
                  </Link>
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <h2 className="text-sm font-medium">No matching events</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different search term or status filter.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
