/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // Add this for more stable development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  
  // Make webpack more verbose for debugging and more stable
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable minimization for easier debugging
      config.optimization.minimize = false;
      
      // Add more stability to module resolution
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
      
      // Increase timeout for chunk loading
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 300,
        poll: 1000,
      };
    }
    return config;
  },
  
  // Improve caching and reduce rebuilds
  poweredByHeader: false,
};

module.exports = nextConfig;