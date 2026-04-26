import type { NextConfig } from "next";

const nextConfig = {
    allowedDevOrigins: ['192.168.1.246'],
    images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};


export default nextConfig;