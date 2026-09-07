import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // The old standalone merchants page was a thinner duplicate of the
  // period-aware one under /stats; keep its links working.
  async redirects() {
    return [
      { source: "/merchants", destination: "/stats/merchants", permanent: false },
      // The Records hub was removed; its lists live under Reports or Stats now.
      { source: "/promotions", destination: "/reports/runs", permanent: false },
      { source: "/events", destination: "/reports/runs", permanent: false },
    ];
  },
};

export default nextConfig;
