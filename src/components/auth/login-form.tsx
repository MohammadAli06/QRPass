"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { AlertCircle, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthEmailDomain } from "@/lib/constants";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { loginSchema, type LoginValues } from "@/lib/schemas";

function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid username or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Could not sign in. Please try again.";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const domain = getAuthEmailDomain();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
        if (user) router.replace("/admin");
      });
    } catch {
      // handled by the configuration notice below
    }
    return () => unsubscribe();
  }, [router]);

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    if (!isFirebaseConfigured) {
      setFormError("Firebase is not configured on this deployment.");
      return;
    }

    try {
      const email = `${values.username.trim().toLowerCase()}@${domain}`;
      await signInWithEmailAndPassword(getFirebaseAuth(), email, values.password);
      toast.success("Signed in");
      router.replace("/admin");
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <QrCode className="size-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">QR Pass</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage events and passes.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <CardDescription>
              Use the username and password provided by your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isFirebaseConfigured && (
              <div
                role="alert"
                className="mb-4 flex gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Firebase is not configured. Add your{" "}
                  <code className="rounded bg-muted px-1">NEXT_PUBLIC_FIREBASE_*</code>{" "}
                  environment variables to <code className="rounded bg-muted px-1">.env.local</code>.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="admin"
                  aria-invalid={Boolean(errors.username) || undefined}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  {...register("username")}
                />
                {errors.username && (
                  <p id="username-error" className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password) || undefined}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isFirebaseConfigured}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          There is no public sign-up. Ask an administrator to create your account.
        </p>
      </div>
    </main>
  );
}
