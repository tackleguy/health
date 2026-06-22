import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep build rooted in outdoor-app/ (avoids picking up parent lockfiles)
  turbopack: {
    root: path.join(process.cwd()),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
