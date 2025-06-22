FROM node:18-bullseye

# Устанавливаем Chromium и зависимости
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
    libgtk-3-0 \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package-файлы и устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm ci

# Устанавливаем Lighthouse CI
RUN npm install -g @lhci/cli@0.15.0

# Копируем код приложения и скрипт-агрегатор
COPY . .

# Собираем приложение
RUN npm run build

# По умолчанию запускаем LHCI и затем ваш агрегатор
CMD lhci autorun \
    && node lh-aggregator.js
