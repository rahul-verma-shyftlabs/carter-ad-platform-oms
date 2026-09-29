/** @type {import('next').NextConfig} */
const path = require('path');

const parentOrigins = (process.env.NEXT_PUBLIC_PARENT_ORIGIN || 'https://stg.trycarter.com')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const frameAncestors = ["'self'", ...parentOrigins].join(' ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: config => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
    ],
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'src')],
    prependData: `@import "~@/styles/resources.scss";`,
  },
};

module.exports = nextConfig;
