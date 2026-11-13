import { Skeleton } from "@/components/ui/skeleton";

export default function VerifyLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6">
        <Skeleton className="mx-auto size-14 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-6 w-40" />
        <Skeleton className="mx-auto mt-3 h-3 w-56" />
        <Skeleton className="mx-auto mt-2 h-3 w-40" />
        <Skeleton className="mt-6 h-24 w-full" />
      </div>
    </main>
  );
}
