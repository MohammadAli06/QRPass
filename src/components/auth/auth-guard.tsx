"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

function AdminSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login");
    }
  }, [loading, configured, user, router]);

  if (!configured) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-6 text-center">
          <ShieldAlert className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-base font-medium">Firebase is not configured</h1>
          <p className="text-sm text-muted-foreground">
            Copy <code className="rounded bg-muted px-1 py-0.5">.env.example</code> to{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env.local</code>, fill in your
            Firebase project values and restart the server.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-dvh">
        <div className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <div className="ml-auto flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          </div>
        </div>
        <AdminSkeleton />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
