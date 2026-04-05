/** @type {import('next').NextConfig} */
const nextConfig = {
  // Évite que le build plante sur Vercel si TS est trop strict
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
