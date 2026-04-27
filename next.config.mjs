/** @type {import('next').NextConfig} */
const nextConfig = {
  // Electron 패키징 시 standalone 출력 (자체 server.js 생성)
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
