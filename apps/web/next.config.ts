import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@glean-rag-chat/core'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs']
    };

    return config;
  }
};

export default nextConfig;
