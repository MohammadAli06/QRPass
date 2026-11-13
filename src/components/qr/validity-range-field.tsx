"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHours, getValidityPresets } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  resolveValidity,
  type ValidityPreset,
} from "@/lib/validity";

interface ValidityRangeFieldProps {
  preset: ValidityPreset;
  onPresetChange: (preset: ValidityPreset) => void;
  customFrom: string;
  customUntil: string;
  onCustomFromChange: (value: string) => void;
  onCustomUntilChange: (value: string) => void;
  eventDefaultHours: number;
  idPrefix?: string;
}

export function ValidityRangeField({
  preset,
  onPresetChange,
  customFrom,
  customUntil,
  onCustomFromChange,
  onCustomUntilChange,
  eventDefaultHours,
  idPrefix = "validity",
}: ValidityRangeFieldProps) {
  const resolution = resolveValidity(
    preset,
    eventDefaultHours,
    customFrom,
    customUntil,
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-preset`}>Validity window</Label>
      <Select
        value={preset}
        onValueChange={(value) => onPresetChange(value as ValidityPreset)}
      >
        <SelectTrigger id={`${idPrefix}-preset`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getValidityPresets(eventDefaultHours).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor={`${idPrefix}-from`}
              className="text-xs font-normal text-muted-foreground"
            >
              Valid from
            </Label>
            <Input
              id={`${idPrefix}-from`}
              type="datetime-local"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${idPrefix}-until`}
              className="text-xs font-normal text-muted-foreground"
            >
              Valid until
            </Label>
            <Input
              id={`${idPrefix}-until`}
              type="datetime-local"
              value={customUntil}
              onChange={(event) => onCustomUntilChange(event.target.value)}
            />
          </div>
        </div>
      )}

      {resolution.error ? (
        <p className="text-xs text-destructive">{resolution.error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(resolution.validFrom)} →{" "}
          {formatDateTime(resolution.validUntil)}
          {preset === "event"
            ? ` (event default, ${formatHours(eventDefaultHours)})`
            : ""}
        </p>
      )}
    </div>
  );
}
