import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow any external image host; board creators supply URLs
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
