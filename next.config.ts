import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "hoirqrkdgbmvpwutwuwj.supabase.co",
      },
    ],
  },
};

export default nextConfig;
