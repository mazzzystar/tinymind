import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
      {
        protocol: 'http',
        hostname: '*',
      },
    ],
  },
  async headers() {
    // CORS configuration - supports single origin only for security
    // Set ALLOWED_ORIGIN env var to override (e.g., 'https://yourdomain.com')
    // For local development, set ALLOWED_ORIGIN=http://localhost:3000
    const defaultOrigin = 'https://tinymind.me';

    // Validate and sanitize ALLOWED_ORIGIN
    const getAllowedOrigin = () => {
      const origin = process.env.ALLOWED_ORIGIN;

      // Use default if not set
      if (!origin) {
        return defaultOrigin;
      }

      // Prevent wildcard for security
      if (origin === '*') {
        console.warn('CORS: Wildcard origin is not allowed for security. Using default origin.');
        return defaultOrigin;
      }

      // Validate URL format
      try {
        const url = new URL(origin);
        // Only allow http/https protocols
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          console.warn(`CORS: Invalid protocol "${url.protocol}". Using default origin.`);
          return defaultOrigin;
        }
        return origin;
      } catch {
        console.warn(`CORS: Invalid origin URL "${origin}". Using default origin.`);
        return defaultOrigin;
      }
    };

    const allowedOrigin = getAllowedOrigin();
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirect www to non-www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.tinymind.me',
          },
        ],
        destination: 'https://tinymind.me/:path*',
        permanent: true,
      },
      // Redirect old paths that are causing duplicate content issues
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/:username/manifest.json',
        destination: '/api/manifest/:username',
      },
      // Keep the root manifest.json as is
      {
        source: '/manifest.json',
        destination: '/manifest.json',
      },
    ];
  },
}

export default withNextIntl(nextConfig);