FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .

RUN node scripts/install-yt-dlp.js && node scripts/install-chrome.js

EXPOSE ${PORT:-3000}
CMD ["node", "server/index.js"]
