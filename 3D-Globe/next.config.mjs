/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    // Ensure JSON imports from world-atlas work across environments
    config.module.rules.push({
      test: /\.geojson$/i,
      type: "json"
    });
    return config;
  }
};

export default nextConfig;
