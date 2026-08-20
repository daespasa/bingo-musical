/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bingo/shared'],
  images: {
    // Las carátulas de las colecciones importadas se sirven desde la CDN de
    // Spotify; las de la demo son locales y no necesitan permiso.
    remotePatterns: [{ protocol: 'https', hostname: 'i.scdn.co' }],
  },
};

export default nextConfig;
