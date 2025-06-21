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
    --no-install-recommends

# Создаем пользователя
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser

WORKDIR /app

# Копируем package-файлы и устанавливаем зависимости
COPY --chown=appuser:appuser package.json package-lock.json ./

RUN apt-get clean && rm -rf /var/lib/apt/lists/* \
    && npm ci \
    && npm install -g @lhci/cli@0.15.0

# Устанавливаем Lighthouse CI
RUN npm install -g @lhci/cli@0.15.0

# Копируем код приложения и скрипт-агрегатор
COPY --chown=appuser:appuser . .

# Собираем приложение
RUN npm run build

# Флаги для Chrome
ENV LHCI_CHROME_FLAGS="--headless --no-sandbox --disable-dev-shm-usage"

# Переключаемся на пользователя
USER appuser

# Healthcheck (опционально)
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:3000/ || exit 1

# Команда запуска
CMD lhci autorun && node lh-aggregator.js