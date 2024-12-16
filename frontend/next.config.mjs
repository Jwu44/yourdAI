/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://www.gstatic.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: https://*.googleusercontent.com",
                "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
                "connect-src 'self' https://identitytoolkit.googleapis.com https://*.firebaseapp.com https://www.googleapis.com http://localhost:8000"
              ].join('; ')
            }
          ]
        }
      ];
    },
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