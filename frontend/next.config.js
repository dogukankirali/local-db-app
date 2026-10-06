/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
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
    // Kapaklar MAL CDN'inden ve backend'in /animeCover adresinden geliyor
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
