/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Cloudflare Pages edge runtime
  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer, nextRuntime }) => {
    // pdfjs-dist uses canvas on Node — stub it out
    config.resolve.alias.canvas = false;

    if (nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        url: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // pdfjs-dist has a dynamic import(workerSrc) with /*webpackIgnore: true*/
    // that Next.js webpack still tries to resolve. Tell webpack to leave it alone.
    if (!isServer) {
      config.resolve.alias['pdfjs-dist/build/pdf.worker.min.mjs'] = false;
    }

    return config;
  },
}

module.exports = nextConfig
