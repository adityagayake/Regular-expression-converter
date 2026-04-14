/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // No rewrites needed — all API routes are Next.js edge functions.
  // The Express backend (backend/) is not deployed to Vercel.
}

export default nextConfig
