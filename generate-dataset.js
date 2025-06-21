// src/scripts/generate-datasets.js

import fs from 'fs'
import path from 'path'

// Оптимизированный генератор тестовых данных
const generateDataset = (size) => {
  const startId = Math.floor(Math.random() * 10000)
  return Array.from({ length: size }, (_, i) => {
    const id = startId + i
    return {
      id,
      name: `Item ${id}`,
      value: Math.random() * 100,
      category: `Category ${Math.floor(Math.random() * 10)}`,
      timestamp: Date.now(),
    }
  })
}

// Измерение производительности
const measurePerformance = async (fn) => {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { result, duration }
}

// Форматирование размера данных
const formatSize = (size) => {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)}M`
  if (size >= 1_000) return `${(size / 1_000).toFixed(1)}K`
  return size.toString()
}

// Новые размеры датасетов
const sizes = [100, 1000, 5000, 10000]

// Путь к папке для сохранения
const outputDir = path.resolve(process.cwd(), 'public', 'data')

// Создаем папку, если не существует
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`Создана папка: ${outputDir}`)
}

;(async () => {
  for (const size of sizes) {
    console.log(`Генерация датасета размера ${formatSize(size)} (${size} записей)...`)

    const { result: data, duration } = await measurePerformance(() =>
      Promise.resolve(generateDataset(size))
    )

    const fileName = `dataset-${size}.json`
    const filePath = path.join(outputDir, fileName)

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`Сохранено: ${fileName}, время генерации: ${duration.toFixed(2)}ms`)
  }
  console.log('Генерация всех датасетов завершена.')
})()
