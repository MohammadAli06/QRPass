import { NextResponse } from "next/server";

import { errorResult, verifyToken } from "@/lib/verify";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    const result = await verifyToken(token, request.headers.get("user-agent"));
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to verify token via API", error);
    return NextResponse.json(errorResult(), {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }
}
