"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { DEFAULT_VALIDITY_HOURS } from "@/lib/constants";
import { eventFormSchema, type EventFormValues } from "@/lib/schemas";

export interface EventFormDefaults {
  name?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  defaultValidityHours?: number;
  mode?: "reusable" | "single-use";
}

interface EventFormProps {
  defaultValues?: EventFormDefaults;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function EventForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const initialHours = defaultValues?.defaultValidityHours ?? DEFAULT_VALIDITY_HOURS;
  const [unit, setUnit] = useState<"hours" | "days">(
    initialHours > 0 && initialHours % 24 === 0 ? "days" : "hours",
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      location: defaultValues?.location ?? "",
      startsAt: defaultValues?.startsAt ?? "",
      endsAt: defaultValues?.endsAt ?? "",
      defaultValidityHours: initialHours,
      mode: defaultValues?.mode ?? "reusable",
    },
  });

  const hours = watch("defaultValidityHours");
  const displayHours = unit === "days" ? Math.round((hours / 24) * 100) / 100 : hours;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Event name</Label>
        <Input
          id="name"
          placeholder="Summer conference 2026"
          aria-invalid={Boolean(errors.name) || undefined}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Optional notes for your team"
          aria-invalid={Boolean(errors.description) || undefined}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Optional"
            aria-invalid={Boolean(errors.location) || undefined}
            {...register("location")}
          />
          {errors.location && (
            <p className="text-xs text-destructive">{errors.location.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mode">Scan mode</Label>
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="mode" className="w-full">
                  <SelectValue placeholder="Select a mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reusable">Reusable (can be scanned many times)</SelectItem>
                  <SelectItem value="single-use">Single-use (valid once)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            {watch("mode") === "single-use"
              ? "The first successful scan marks the pass as used."
              : "The pass stays valid until it expires or is revoked."}
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Event starts</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            aria-invalid={Boolean(errors.startsAt) || undefined}
            {...register("startsAt")}
          />
          {errors.startsAt && (
            <p className="text-xs text-destructive">{errors.startsAt.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="endsAt">Event ends</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            aria-invalid={Boolean(errors.endsAt) || undefined}
            {...register("endsAt")}
          />
          {errors.endsAt && (
            <p className="text-xs text-destructive">{errors.endsAt.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="defaultValidityHours">Default pass validity</Label>
        <div className="flex gap-2">
          <Controller
            control={control}
            name="defaultValidityHours"
            render={({ field }) => (
              <Input
                id="defaultValidityHours"
                type="number"
                min={1}
                step={unit === "days" ? 0.5 : 1}
                className="max-w-40"
                value={displayHours}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  if (!Number.isFinite(raw)) return;
                  const next =
                    unit === "days"
                      ? Math.round(raw * 24)
                      : Math.round(raw);
                  field.onChange(Math.max(0, next));
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={Boolean(errors.defaultValidityHours) || undefined}
              />
            )}
          />
          <Select
            value={unit}
            onValueChange={(value) => setUnit(value as "hours" | "days")}
          >
            <SelectTrigger aria-label="Validity unit" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {errors.defaultValidityHours ? (
          <p className="text-xs text-destructive">
            {errors.defaultValidityHours.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            New passes default to this window when you generate them.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
