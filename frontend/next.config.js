/** @type {import('next').NextConfig} */

// `npm run build:cf`: Cloudflare Worker'ın sunacağı statik çıktı (out/). API aynı origin'de /api altında.
// `npm run build`: Docker için standalone Node sunucusu.
const staticExport = process.env.npm_lifecycle_event === "build:cf" || process.env.NEXT_OUTPUT === "export";
// `next dev` sırasında /api istekleri lokal Worker'a (wrangler dev) yönlendirilir
const devApi = process.env.KIROKU_API_ORIGIN || "http://127.0.0.1:8787";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: staticExport ? "export" : "standalone",
  // Eski kodda çok sayıda `any` var; lint build'i kırmasın (tip kontrolü açık kalır)
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // MUI ikon/bileşen importlarını yalnızca kullanılan modüllere indirger
    optimizePackageImports: ["@mui/material", "@mui/icons-material", "lodash"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    // Kapaklar MAL CDN'inden ve /api/animeCover adresinden geliyor
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
  ...(staticExport
    ? {}
    : {
        async rewrites() {
          return [{ source: "/api/:path*", destination: `${devApi}/api/:path*` }];
        },
      }),
};

module.exports = nextConfig;
