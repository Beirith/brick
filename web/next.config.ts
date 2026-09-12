import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // This project uses TypeScript 5, whose compiler API avoids a CLI output parsing issue in Next 16 builds.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
