import type { NextConfig } from "next";

// Security headers (incl. nonce-based CSP) are emitted from `proxy.ts`
// per request so the script-src nonce stays unique. Static fallback
// headers are kept here for asset routes the middleware doesn't match.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
