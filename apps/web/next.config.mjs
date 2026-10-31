/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  allowedDevOrigins: [
    "172.198.152.197",
    "172.198.152.197:3001",
    "172.198.152.197:80",
    "localhost",
    "localhost:3001",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3001",
  ],
  async rewrites() {
    const apiTarget = process.env.FASTAPI_INTERNAL_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/v1/:path*",
        destination: `${apiTarget}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

