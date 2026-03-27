/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Cloudflare Pages edge runtime
  images: {
    unoptimized: true,
  },
  // Prevent heavy Node.js-only packages from leaking into server/edge bundles.
  // These are 'use client' only — they must never be server-side bundled.
  serverExternalPackages: ['jspdf', 'jspdf-autotable', 'pdfjs-dist', 'qrcode', 'canvas'],
  webpack: (config, { isServer }) => {
    // pdfjs-dist uses canvas on Node — stub it out
    config.resolve.alias.canvas = false;

    // pdfjs-dist has a dynamic import(workerSrc) with /*webpackIgnore: true*/
    // that Next.js webpack still tries to resolve. Tell webpack to leave it alone.
    if (!isServer) {
      config.resolve.alias['pdfjs-dist/build/pdf.worker.min.mjs'] = false;
    }

    return config;
  },
}

module.exports = nextConfig
