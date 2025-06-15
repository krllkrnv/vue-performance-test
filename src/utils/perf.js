// src/utils/perf.js

// Оптимизированный генератор тестовых данных
export const generateDataset = (size) => {
  const startId = Math.floor(Math.random() * 10000);
  return Array.from({ length: size }, (_, i) => {
    const id = startId + i;
    return {
      id,
      name: `Item ${id}`,
      value: Math.random() * 100,
      category: `Category ${Math.floor(Math.random() * 10)}`,
      timestamp: Date.now()
    };
  });
};

// Ожидание рендеринга
export const waitForRender = () => {
  return new Promise(resolve => requestAnimationFrame(resolve));
};

// Измерение производительности
export const measurePerformance = async (fn) => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

// Форматирование размера данных
export const formatSize = (size) => {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)}M`;
  if (size >= 1_000) return `${(size / 1_000).toFixed(1)}K`;
  return size.toString();
};
