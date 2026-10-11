import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  output: isDev ? undefined : 'export',
  // Include the local filesystem proxy in dev only; static exports have no API.
  pageExtensions: isDev ? ['dev.ts', 'tsx', 'ts', 'jsx', 'js'] : ['tsx', 'ts', 'jsx', 'js'],
  skipTrailingSlashRedirect: isDev,
  basePath: '',
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'iurys-macbook-pro.taila5dafe.ts.net'],
  transpilePackages: ['@agents/visual-artifact-annotations'],
};

export default nextConfig;
