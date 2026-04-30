import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean),
    },
  },
};

export default nextConfig;
