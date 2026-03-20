import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "file.alphasquare.co.kr" },
      { protocol: "https", hostname: "financialmodelingprep.com" },
    ],
  },
};

export default nextConfig;
