# Phải khớp version với browser có sẵn trong image mcr.microsoft.com/playwright
FROM mcr.microsoft.com/playwright:v1.49.1-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build \
 && npm prune --omit=dev \
 && rm -rf src

ENV PORT=4321
EXPOSE 4321

CMD ["node", "server.mjs"]
