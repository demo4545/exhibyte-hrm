import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "exhibytesolution.com",
        pathname: "/wp-content/**",
      },
    ],
  },
  reactStrictMode: false,
};

export default nextConfig;
