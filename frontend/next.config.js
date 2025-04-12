/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint kontrollerini tamamen devre dışı bırak
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript kontrollerini de devre dışı bırakalım
    ignoreBuildErrors: true,
  },
  experimental: {
    turbo: {
      rules: {
        // Turbopack rules configuration
      },
    },
  },
  // Diğer Next.js yapılandırmaları
  reactStrictMode: true,
  // Static dosyaların doğru servis edilmesi için
  assetPrefix: "",
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      use: {
        loader: "file-loader",
        options: {
          name: "[name].[ext]",
          publicPath: "/_next/static/fonts/",
          outputPath: "static/fonts/",
        },
      },
    });
    return config;
  },
};

module.exports = nextConfig;
