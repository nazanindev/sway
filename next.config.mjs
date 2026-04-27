/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow any external image host; board creators supply URLs
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
