/** @type {import('next').NextConfig} */
const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
  process.env.TURNSTILE_SITE_KEY?.trim() ||
  '';

const nextConfig = {
  env: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileSiteKey,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v87ndduxgx.ufs.sh',
        port: '',
        pathname: '/f/**',
      },
    ],
  },
};

export default nextConfig;