/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
