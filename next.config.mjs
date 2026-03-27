/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },

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

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
