/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === "production" && !process.env.VERCEL ? "standalone" : undefined,
  experimental: {
    serverComponentsExternalPackages: ["@google/generative-ai"],
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "date-fns-tz",
      "clsx",
      "tailwind-merge",
      "sonner",
    ],
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

      // Ignore watching build artifacts and VCS files to prevent dev server thrashing
      config.watchOptions = {
        poll: false,
        ignored: ["**/node_modules", "**/.git", "**/.next"],
      };
    }
    return config;
  },
};

export default nextConfig;
