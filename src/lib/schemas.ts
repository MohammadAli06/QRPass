import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters")
  .max(64, "Username is too long")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Use letters, numbers, dots, underscores or dashes only",
  );

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const toneSchema = z.enum(["success", "warning", "error", "neutral"]);

export const displayContentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80, "Keep it under 80 characters"),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(300, "Keep it under 300 characters"),
  tone: toneSchema,
});

export const displayConfigSchema = z.object({
  valid: displayContentSchema,
  expired: displayContentSchema,
  notYetValid: displayContentSchema,
  revoked: displayContentSchema,
  used: displayContentSchema,
  invalid: displayContentSchema,
});

export const showFieldsSchema = z.array(z.string().min(1).max(80)).max(50);

export const eventFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Event name is required")
      .max(120, "Keep the name under 120 characters"),
    description: z
      .string()
      .trim()
      .max(2000, "Keep the description under 2000 characters"),
    location: z.string().trim().max(200, "Keep the location under 200 characters"),
    startsAt: z.string(),
    endsAt: z.string(),
    defaultValidityHours: z
      .number()
      .int("Use a whole number of hours")
      .min(1, "Must be at least 1 hour")
      .max(8760, "Maximum is 365 days"),
    mode: z.enum(["reusable", "single-use"]),
  })
  .superRefine((values, ctx) => {
    if (!values.startsAt || !values.endsAt) return;
    const start = new Date(values.startsAt);
    const end = new Date(values.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be after start",
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const qrInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Keep the name under 120 characters"),
  email: z
    .union([z.literal(""), z.string().email("Enter a valid email address")])
    .optional(),
  label: z.string().trim().max(80, "Keep the label under 80 characters").optional(),
  meta: z
    .record(z.string().max(60, "Custom field keys must be under 60 characters"), z.string().max(300))
    .optional(),
});

export const tokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid token format");

