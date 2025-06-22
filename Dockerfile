# 1. Базовый образ
FROM node:18-bullseye

# 2. Устанавливаем Chromium и зависимости
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
    rm -rf /var/lib/apt/lists/*

# 3. Симлинки, чтобы Chromium находился как chrome
RUN ln -s /usr/bin/chromium /usr/bin/chrome && \
    ln -s /usr/bin/chromium /usr/bin/google-chrome && \
    ln -s /usr/bin/chromium /usr/bin/google-chrome-stable

# 4. Создаём непривилегированного пользователя для запуска Chrome
RUN useradd -ms /bin/bash lighthouse

# 5. Переменные окружения для LHCI/Chrome
ENV CHROME_PATH=/usr/bin/chromium
ENV LHCI_CHROME_FLAGS="--headless --no-sandbox --disable-setuid-sandbox --disable-gpu"

# 6. Рабочая директория
WORKDIR /app

# 7. Копируем package-файлы и устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm ci

# 8. Устанавливаем Lighthouse CI глобально
RUN npm install -g @lhci/cli@0.15.0

# 9. Копируем весь проект и собираем Vue-приложение
COPY . .
RUN npm run build

# 10. Отдаём права на /app непривилегированному пользователю
RUN chown -R lighthouse:lighthouse /app

# 11. Переключаемся на пользователя lighthouse
USER lighthouse

# 12. Открываем порт для HTTP-просмотра
EXPOSE 4173

# 13. Запускаем LHCI autorun
CMD ["lhci", "autorun"]
