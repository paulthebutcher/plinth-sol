import type { NextConfig } from "next";

const isVercelBuild =
  process.env.PLINTH_DEPLOY_TARGET === "vercel" || process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: isVercelBuild ? "tsconfig.vercel.json" : "tsconfig.json",
  },
};

export default nextConfig;
