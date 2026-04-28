/** @type {import('next').NextConfig} */
const nextConfig = {
  // Electron 패키징 시 standalone 출력 (자체 server.js 생성)
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async rewrites() {
    return [
      { source: "/mongcool", destination: "/mongcool/index.html" },
      { source: "/mongcool/", destination: "/mongcool/index.html" },
    ];
  },
};

export default nextConfig;
