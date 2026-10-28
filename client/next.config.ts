import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {},
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
