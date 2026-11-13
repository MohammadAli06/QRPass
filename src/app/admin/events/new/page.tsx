"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { EventForm } from "@/components/events/event-form";
import { Card, CardContent } from "@/components/ui/card";
import { createEvent } from "@/lib/firestore/events";
import { errorMessage } from "@/lib/firestore/helpers";

export default function NewEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
          <p className="text-sm text-muted-foreground">
            Set up the event first. You can generate passes right after.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <EventForm
            submitLabel="Create event"
            onCancel={() => router.push("/admin")}
            onSubmit={async (values) => {
              if (!user) {
                toast.error("Your session expired. Please sign in again.");
                return;
              }
              try {
                await createEvent(
                  {
                    name: values.name,
                    description: values.description,
                    location: values.location,
                    startsAt: values.startsAt || null,
                    endsAt: values.endsAt || null,
                    defaultValidityHours: values.defaultValidityHours,
                    mode: values.mode,
                  },
                  user.uid,
                );
                toast.success("Event created");
                router.push("/admin");
              } catch (error) {
                toast.error(errorMessage(error, "Could not create the event"));
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
