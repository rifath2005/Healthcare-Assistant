/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === "production" && !process.env.VERCEL ? "standalone" : undefined,
  experimental: {
    serverComponentsExternalPackages: ["@google/generative-ai"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
