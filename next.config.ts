import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: { "/*": ["./data/trail-catalog/**/*"] },
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "nwxgovpuwxiksmrhsmkk.supabase.co",
      },
    ],
  },
};

export default nextConfig;
