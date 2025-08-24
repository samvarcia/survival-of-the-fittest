/** @type {import('next').NextConfig} */
const nextConfig = {
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
  }
  
  export default nextConfig