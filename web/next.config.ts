import type { NextConfig } from "next";

import { VERCEL_BLOB_REMOTE_HOSTNAME } from "./src/lib/vercel-blob-host";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: VERCEL_BLOB_REMOTE_HOSTNAME,
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4.25mb",
    },
  },
};

export default nextConfig;
