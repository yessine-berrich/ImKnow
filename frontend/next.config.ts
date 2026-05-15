import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
    
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  images: {
    remotePatterns: [
          {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/users/profile-image/**', // ← Changé de /uploads/ à /api/users/profile-image/
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
