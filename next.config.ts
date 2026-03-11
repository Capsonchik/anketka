import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'survey-all.ru',
      },
    ],
  },

};

export default nextConfig;
