import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel serves Next itself; standalone is for Docker/Render-style hosts.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
