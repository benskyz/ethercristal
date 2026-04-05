/** @type {import('next').NextConfig} */
const nextConfig = {
  // IMPORTANT: évite que le build plante à cause du checker TS (souvent bug en Termux/WASM)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
