import { resolve } from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  output: isDev ? undefined : 'export',
  // proxy.ts needs the standard filename for Turbopack's Node runtime.
  // All pages use .tsx; exclude the .ts proxy from API-free static exports.
  pageExtensions: isDev ? ['tsx', 'ts', 'jsx', 'js'] : ['tsx', 'jsx', 'js'],
  skipTrailingSlashRedirect: isDev,
  basePath: '',
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'iurys-macbook-pro.taila5dafe.ts.net'],
  transpilePackages: ['@agents/visual-artifact-annotations'],
  // The dev filesystem proxy imports the sibling CLI's validation and writer.
  turbopack: {
    root: resolve(__dirname, '..'),
    resolveAlias: {
      '@agents/visual-artifact-annotations': '../shared/dist/annotations.js',
    },
  },
};

export default nextConfig;
