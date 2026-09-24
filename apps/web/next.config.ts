import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const originOf = (url: string | undefined) => {
  try { return url ? new URL(url).origin : ""; } catch { return ""; }
};

// Browser-side fetches: BSC RPC (viem) and the optional external agent.
const connectSrc = [
  "'self'",
  originOf(process.env.NEXT_PUBLIC_RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org"),
  originOf(process.env.NEXT_PUBLIC_AGENT_URL),
  isDev ? "ws: http://127.0.0.1:8545 http://localhost:8545" : "",
].filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isDev ? "" : "upgrade-insecure-requests",
].filter(Boolean).join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
