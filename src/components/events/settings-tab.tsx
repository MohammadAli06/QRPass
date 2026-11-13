"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteEvent,
  eventToFormDefaults,
  setEventArchived,
  updateEventDetails,
} from "@/lib/firestore/events";
import { errorMessage } from "@/lib/firestore/helpers";
import type { EventDoc } from "@/types";

export function SettingsTab({ event }: { event: EventDoc }) {
  const router = useRouter();
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const archived = event.status === "archived";

  async function toggleArchive() {
    setArchiveBusy(true);
    try {
      await setEventArchived(event.id, !archived);
      toast.success(archived ? "Event restored" : "Event archived");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the event"));
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      toast.success("Event deleted");
      router.push("/admin");
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete the event"));
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
          <CardDescription>
            These values apply to new passes and the public verification page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventForm
            defaultValues={eventToFormDefaults(event)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              try {
                await updateEventDetails(event.id, {
                  name: values.name,
                  description: values.description,
                  location: values.location,
                  startsAt: values.startsAt || null,
                  endsAt: values.endsAt || null,
                  defaultValidityHours: values.defaultValidityHours,
                  mode: values.mode,
                });
                toast.success("Event updated");
              } catch (error) {
                toast.error(errorMessage(error, "Could not update the event"));
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{archived ? "Archived event" : "Archive event"}</CardTitle>
          <CardDescription>
            {archived
              ? "This event is archived. Passes still verify until they expire. Restore it to keep working on it."
              : "Archiving hides the event from the default dashboard view. Passes keep verifying until they expire."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => void toggleArchive()}
            disabled={archiveBusy}
          >
            {archiveBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : archived ? (
              <RotateCcw aria-hidden="true" />
            ) : (
              <Archive aria-hidden="true" />
            )}
            {archived ? "Restore event" : "Archive event"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete event</CardTitle>
          <CardDescription>
            Permanently delete this event, its {event.qrCount ?? 0} passes and all
            scan history. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden="true" />
            Delete event
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this event?"
        description={`"${event.name}", its passes and scan history will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete event"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
