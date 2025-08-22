import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper build output
  eslint: {
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize for production builds
  productionBrowserSourceMaps: false,

  // Configure webpack for better compatibility
  webpack: (config, { isServer }) => {
    // Ensure proper CSS handling and fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
