import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  async rewrites() {
    // Get backend API URL from environment variable
    // BACKEND_API_URL is server-side only (more secure)
    // NEXT_PUBLIC_API_BASE_URL is available at build time
    // Default to localhost for local development
    const apiUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8000";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
