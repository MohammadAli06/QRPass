import { VerificationCard } from "@/components/verify/verification-card";
import { isBrandingHidden } from "@/lib/format";
import type { VerificationResult } from "@/types";

export function VerificationPage({ result }: { result: VerificationResult }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <VerificationCard
        display={result.display}
        fields={result.fields}
        eventName={result.eventName}
        showBranding={!isBrandingHidden()}
      />
    </main>
  );
}
