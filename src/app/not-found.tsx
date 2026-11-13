import { Button } from "@/components/ui/button";
import Link from "next/link";
import { QrCode } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-muted">
          <QrCode className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-medium">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist or has moved.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
