const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  outputDirectory: '.next/analyze',
  reportFilename: 'bundle-report.html',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query', 'framer-motion'],
  },
  images: {
    domains: ['localhost'],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
