FROM node:18

WORKDIR /app

# Устанавливаем зависимости
COPY package.json .
RUN npm install

# Копируем исходный код
COPY . .

# Запуск тестов
CMD ["npm", "run", "test:e2e"]