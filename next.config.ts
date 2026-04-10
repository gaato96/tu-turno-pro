import type { NextConfig } from "next";

// Force Argentina timezone globally (UTC-3)
process.env.TZ = "America/Argentina/Buenos_Aires";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
