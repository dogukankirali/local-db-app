/** @type {import('next').NextConfig} */
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';
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
      // Turbopack'i devreye almak istiyorsanız bu kısımla ilgili kuralları belirleyebilirsiniz
      // Ancak bu özellik deneme aşamasında olduğu için devre dışı bırakılabilir
      rules: {
        // Özel Turbopack kuralları burada tanımlanabilir
      },
    },
  },
  // React strict mode, genellikle geliştirme sırasında daha iyi hata yakalamak için kullanılır
  reactStrictMode: true,
  // Static dosyaların doğru servis edilmesi için
  assetPrefix: "",
  webpack: (config) => {
    // Font dosyalarının işlenmesi
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

    // Büyük dosya boyutlarını kontrol etmek için optimization ekleyelim
    config.optimization.splitChunks = {
      chunks: "all",
      maxSize: 250000, // 250 KB, büyük dosyaların bölünmesi sağlanır
    };

    // Webpack yapılandırmasına ek optimizasyonlar yapılabilir
    config.resolve.fallback = {
      fs: false,
      path: false,
    };

    return config;
  },
  // Diğer Next.js yapılandırmaları
  images: {
    // Görsellerin optimizasyonunu sağlamak için alt yapı kullanabiliriz
    domains: ["example.com", "cloudflare.com"], // İzin verilen domainler
  },
};


 if (process.env.NODE_ENV === 'development') {
   await setupDevPlatform();
 }

export default nextConfig;
