/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // face-api.js / TensorFlow.js require these to be excluded server-side
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
  images: {
    // Allow images from any configured storage host
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
