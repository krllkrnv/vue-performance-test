// Генератор тестовых данных
export const generateDataset = (size) => {
  const data = []
  const startId = Math.floor(Math.random() * 10000) // Для разнообразия

  for (let i = 0; i < size; i++) {
    const id = startId + i
    data.push({
      id,
      name: `Item ${id}`,
      value: Math.random() * 100,
      category: `Category ${Math.floor(Math.random() * 10)}`,
      timestamp: Date.now()
    })
  }
  return data
}

// Ожидание рендеринга
export const waitForRender = () => {
  return new Promise(resolve => requestAnimationFrame(resolve))
}

// Измерение производительности
export const measurePerformance = async (fn) => {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { result, duration }
}

// Форматирование размера данных
export const formatSize = (size) => {
  if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`
  if (size >= 1000) return `${(size / 1000).toFixed(1)}K`
  return size
}
