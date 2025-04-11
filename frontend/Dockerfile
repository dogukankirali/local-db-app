# Build stage
FROM node:20-alpine AS builder

# Çalışma dizinini ayarla
WORKDIR /app

# Package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --legacy-peer-deps

# Kaynak kodları kopyala
COPY . .

# Next.js uygulamasını build et
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Node.js ortamını production'a ayarla
ENV NODE_ENV=production

# Sistem paketlerini yükle
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Gerekli dosyaları kopyala
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Kullanıcı izinlerini ayarla
RUN chown -R nextjs:nodejs /app

# Nextjs kullanıcısına geç
USER nextjs

# Port'u aç
EXPOSE 3000

# Env variable'ları ayarla (düzeltilmiş syntax)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Uygulamayı çalıştır
CMD ["node", "server.js"] 