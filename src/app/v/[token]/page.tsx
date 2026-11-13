import type { Metadata } from "next";
import { headers } from "next/headers";

import { VerificationPage } from "@/components/verify/verification-page";
import { errorResult, verifyToken } from "@/lib/verify";
import type { VerificationResult } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Verify pass",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let result: VerificationResult;
  try {
    const requestHeaders = await headers();
    result = await verifyToken(token, requestHeaders.get("user-agent"));
  } catch (error) {
    console.error("Failed to verify token", error);
    result = errorResult();
  }

  return <VerificationPage result={result} />;
}
