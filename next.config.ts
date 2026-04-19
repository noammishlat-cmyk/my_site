import type { NextConfig } from "next";

const nextConfig = {
  // Allows the specified origins to access the Next.js dev server resources
  allowedDevOrigins: [
    '192.168.1.246', 
    'http://192.168.1.246:3000'
  ],
};


export default nextConfig;