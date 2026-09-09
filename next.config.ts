import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // The old standalone merchants page was a thinner duplicate of the
  // period-aware one under /stats; keep its links working.
  async redirects() {
    return [
      { source: "/stats", destination: "/stats/clients", permanent: false },
      { source: "/merchants", destination: "/stats/merchants", permanent: false },
      {
        source: "/promotions",
        has: [{ type: "query", key: "tab", value: "bot-detection" }],
        destination: "/stats/bot-detection",
        permanent: false,
      },
      {
        source: "/promotions",
        has: [{ type: "query", key: "tab", value: "client-files" }],
        destination: "/stats/client-files",
        permanent: false,
      },
      { source: "/promotions", destination: "/reports/runs", permanent: false },
      {
        source: "/events",
        has: [{ type: "query", key: "type", value: "csv" }],
        destination: "/stats/client-files",
        permanent: false,
      },
      { source: "/events", destination: "/stats/bot-detection", permanent: false },
    ];
  },
};

export default nextConfig;
