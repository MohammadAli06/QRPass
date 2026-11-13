import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      { source: "/v/:path*", headers: noStoreHeaders },
      { source: "/api/verify/:path*", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;
