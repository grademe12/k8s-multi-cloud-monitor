/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // ← 정적 export
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
