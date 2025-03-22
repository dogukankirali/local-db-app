/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack yapılandırması
  experimental: {
    turbo: {
      // Turbopack'in webpack ile uyumlu çalışması için gerekli ayarlar
      resolveAlias: {
        // Özel alias tanımlamaları buraya eklenebilir
      },
      // Webpack loaderları için uyumluluk ayarları
      loaders: {
        // Özel loader tanımlamaları buraya eklenebilir
      },
    },
  },
  // Diğer Next.js yapılandırmaları
  reactStrictMode: true,
  // swcMinify seçeneği kaldırıldı çünkü artık varsayılan olarak etkin
};

module.exports = nextConfig;
