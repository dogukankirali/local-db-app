# İlk aşama: Üretim için build yap
FROM --platform=arm64 node:19.5.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
COPY certs ./certs
RUN npm run build

# Port tanımla
EXPOSE 3000

ENV PORT=3000

# NGINX'i başlat
CMD ["npm", "start"]


