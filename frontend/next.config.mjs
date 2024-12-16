/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/emulator/:path*',
          destination: 'http://localhost:9099/:path*'
        }
      ]
    }
  };
  
  export default nextConfig;