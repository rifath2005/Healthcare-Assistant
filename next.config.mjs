/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === "production" && !process.env.VERCEL ? "standalone" : undefined,
  experimental: {
    serverComponentsExternalPackages: ["@google/generative-ai"],
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Extend chunk loading timeout to 60 seconds during local development
      // to eliminate ChunkLoadError timeouts during first-time cold-start compilation
      config.output = {
        ...config.output,
        chunkLoadTimeout: 60000,
      };
    }
    return config;
  },
};

export default nextConfig;
