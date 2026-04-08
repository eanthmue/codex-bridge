import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.1.45', '192.168.1.45:3000', '192.168.103.174', '192.168.103.174:3000'],
};

export default nextConfig;
