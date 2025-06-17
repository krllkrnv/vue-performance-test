<template>
  <div class="render-test">
    <div class="info">
      Тестирование рендеринга: {{ size }} элементов
      <div v-if="status" class="status">{{ status }}</div>
    </div>
    <table v-if="data.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Value</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
          <td>{{ item.category }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits, defineProps } from 'vue'
import { generateDataset } from '@/utils/perf'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})
const emit = defineEmits(['test-completed'])

const data = ref([])
const status = ref('')

// Core Web Vitals и другие метрики
let tbt = 0
let cls = 0
let lcpEntry = null
let fcpEntry = null
let memoryBefore = 0
let memoryAfter = 0
let memoryPeak = 0

// Настройка PerformanceObserver для TBT, CLS, FCP, LCP
function setupPerformanceObservers() {
  const longTaskObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.duration > 50) {
        tbt += entry.duration - 50
      }
    })
  })
  longTaskObserver.observe({ type: 'longtask', buffered: true })

  const clsObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) {
        cls += entry.value
      }
    })
  })
  clsObserver.observe({ type: 'layout-shift', buffered: true })

  const lcpObserver = new PerformanceObserver(list => {
    const entries = list.getEntries()
    if (entries.length) {
      lcpEntry = entries[entries.length - 1]
    }
  })
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

  const paintObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        fcpEntry = entry
      }
    })
  })
  paintObserver.observe({ type: 'paint', buffered: true })

  return {
    disconnect: () => {
      longTaskObserver.disconnect()
      clsObserver.disconnect()
      lcpObserver.disconnect()
      paintObserver.disconnect()
    }
  }
}

// Дожидаемся полного цикла рендеринга
const waitForAnimationFrame = () => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(performance.now())
      })
    })
  })
}

async function measureRender() {
  // 1) Прогрев
  status.value = 'Прогрев...'
  data.value = generateDataset(props.size)
  await waitForAnimationFrame()

  // 2) Очистка
  status.value = 'Очистка...'
  data.value = []
  await waitForAnimationFrame()

  // 3) Сброс предыдущих замеров
  performance.clearResourceTimings()
  performance.clearMeasures()
  performance.clearMarks()

  // 4) Сброс внутренних метрик
  tbt = 0
  cls = 0
  lcpEntry = null
  fcpEntry = null
  memoryBefore = performance.memory?.usedJSHeapSize || 0
  memoryPeak = memoryBefore

  // 5) Включаем наблюдателей
  const perfObservers = setupPerformanceObservers()

  // 6) Основной замер
  status.value = 'Измерение...'
  const startTime = performance.now()
  data.value = generateDataset(props.size)

  // Мониторинг пиков памяти
  const memInterval = setInterval(() => {
    const used = performance.memory?.usedJSHeapSize || 0
    if (used > memoryPeak) memoryPeak = used
  }, 50)

  const renderEnd = await waitForAnimationFrame()
  clearInterval(memInterval)
  memoryAfter = performance.memory?.usedJSHeapSize || memoryAfter

  // 7) Отключаем наблюдателей
  perfObservers.disconnect()

  const duration = renderEnd - startTime
  return {
    duration,
    tbt,
    cls,
    fcp: fcpEntry ? fcpEntry.startTime : 0,
    lcp: lcpEntry ? lcpEntry.startTime : 0,
    memoryBefore,
    memoryAfter,
    memoryPeak
  }
}

async function runTest() {
  status.value = 'Подготовка...'
  try {
    const metrics = await measureRender()

    if (!window.performanceResults) window.performanceResults = {}
    if (!window.performanceResults.render) window.performanceResults.render = []

    window.performanceResults.render.push({
      size: props.size,
      ...metrics,
      timestamp: Date.now()
    })

    console.log(
      `Render test completed: ${props.size} items, duration ${metrics.duration.toFixed(2)}ms`,
      metrics
    )
    status.value = `Готово: ${metrics.duration.toFixed(2)}ms`
  } catch (error) {
    console.error('Render test error:', error)
    status.value = 'Ошибка: ' + error.message
  } finally {
    emit('test-completed')
  }
}

onMounted(runTest)
</script>

<style scoped>
.render-test {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.info {
  font-weight: bold;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
  position: relative;
}

.status {
  font-weight: normal;
  font-size: 0.9em;
  color: #666;
  margin-top: 5px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
  position: sticky;
  top: 0;
}

tbody tr:nth-child(even) {
  background-color: #f8f8f8;
}

tbody tr:hover {
  background-color: #f0f7ff;
}
</style>
