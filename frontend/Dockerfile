# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# API URL'i sabit olarak tanımla
ENV NEXT_PUBLIC_API_URL=https://animeservice.dogukankirali.com

# Gerekli paketleri yükle
RUN apk add --no-cache curl fontconfig openssl

# Poppins fontlarını indir
RUN mkdir -p /app/public/fonts && \
    cd /app/public/fonts && \
    wget https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLGT9Z1xlFQ.woff2 -O Poppins-Medium.woff2 && \
    wget https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDz8Z1xlFQ.woff2 -O Poppins-Regular.woff2 && \
    wget https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2 -O Poppins-SemiBold.woff2 && \
    wget https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDD4Z1xlFQ.woff2 -O Poppins-Bold.woff2 && \
    wget https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLBT5Z1xlFQ.woff2 -O Poppins-Light.woff2

# Package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --legacy-peer-deps

# Kaynak kodları kopyala
COPY . .

# Build et
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=https://animeservice.dogukankirali.com

# Gerekli paketleri yükle
RUN apk add --no-cache curl fontconfig openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Gerekli dosyaları kopyala
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./server.js

# Kullanıcı izinlerini ayarla
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# HTTPS ile başlat
CMD ["npm", "run", "start:https"]