<template>
  <div class="update-test">
    <div class="info">
      Циклическое обновление данных: {{ cycles }} циклов по {{ batchSize }} записей | Первичный размер: {{ size }}
      <div v-if="status" class="status">{{ status }}</div>
    </div>

    <div class="stats" v-if="durations.length">
      <p>Средняя длительность пакета: {{ avgDuration.toFixed(2) }} мс</p>
      <p>Медиана длительности: {{ medianDuration.toFixed(2) }} мс</p>
      <p>Средний TBT: {{ avgTBT.toFixed(2) }} мс</p>
      <p>Средний CLS: {{ avgCLS.toFixed(4) }}</p>
      <p>Средний FPS: {{ avgFPS.toFixed(2) }}</p>
    </div>

    <table v-if="data.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits, defineProps } from 'vue'
import { generateDataset } from '@/utils/perf'

const props = defineProps({
  size:      { type: Number, required: true },
  batchSize: { type: Number, default: 100 },
  cycles:    { type: Number, default: 10 }
})
const emit = defineEmits(['test-completed'])

const data = ref([])
const durations = ref([])
const tbtValues = ref([])
const clsValues = ref([])
const fpsValues = ref([])
const status = ref('')

// Метрики вычисления
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
const median = arr => {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const avgDuration = computed(() => avg(durations.value))
const medianDuration = computed(() => median(durations.value))
const avgTBT = computed(() => avg(tbtValues.value))
const avgCLS = computed(() => avg(clsValues.value))
const avgFPS = computed(() => avg(fpsValues.value))

// Ожидание полного цикла рендеринга
const waitForAnimationFrame = () => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

// Настройка наблюдателей производительности
const setupObservers = () => {
  let tbt = 0
  let cls = 0

  // Long Tasks для TBT
  const longTaskObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.duration > 50) tbt += entry.duration - 50
    })
  })
  longTaskObserver.observe({ type: "longtask", buffered: true })

  // Layout Shifts для CLS
  const clsObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) cls += entry.value
    })
  })
  clsObserver.observe({ type: "layout-shift", buffered: true })

  return {
    getMetrics: () => ({ tbt, cls }),
    disconnect: () => {
      longTaskObserver.disconnect()
      clsObserver.disconnect()
    }
  }
}

// Измерение FPS в течение указанного времени
const measureFPS = (duration) => {
  return new Promise(resolve => {
    let frames = 0
    let startTime = performance.now()

    const countFrame = () => {
      frames++
      const elapsed = performance.now() - startTime

      if (elapsed < duration) {
        requestAnimationFrame(countFrame)
      } else {
        const fps = (frames * 1000) / elapsed
        resolve(fps)
      }
    }

    requestAnimationFrame(countFrame)
  })
}

async function runTest() {
  status.value = 'Подготовка...'
  data.value = []
  durations.value = []
  tbtValues.value = []
  clsValues.value = []
  fpsValues.value = []

  try {
    // Прогревочный рендер
    status.value = 'Прогрев...'
    data.value = generateDataset(props.size)
    await waitForAnimationFrame()

    // Основные циклы обновления
    status.value = `Выполнение теста (0/${props.cycles})...`

    for (let i = 0; i < props.cycles; i++) {
      status.value = `Цикл ${i + 1}/${props.cycles}...`

      // Настройка наблюдателей для текущего цикла
      const observers = setupObservers()
      const beforeMetrics = observers.getMetrics()

      // Генерация новых данных
      const newData = generateDataset(props.batchSize)

      // Замер времени начала
      const start = performance.now()

      // Выполняем обновление
      data.value = [...data.value, ...newData]

      // Замер FPS во время обновления
      const fpsPromise = measureFPS(200) // Измеряем FPS минимум 200ms

      // Ожидаем завершения рендеринга
      await waitForAnimationFrame()

      // Фиксируем время выполнения
      const duration = performance.now() - start

      // Получаем FPS
      const fps = await fpsPromise

      // Получаем метрики после выполнения
      const afterMetrics = observers.getMetrics()
      observers.disconnect()

      // Рассчитываем дельты
      const tbtDelta = afterMetrics.tbt - beforeMetrics.tbt
      const clsDelta = afterMetrics.cls - beforeMetrics.cls

      // Сохраняем результаты цикла
      durations.value.push(duration)
      tbtValues.value.push(tbtDelta)
      clsValues.value.push(clsDelta)
      fpsValues.value.push(fps)

      console.log(
        `Update batch ${i + 1}/${props.cycles} for size ${props.size}: ` +
        `${duration.toFixed(2)}ms, TBT ${tbtDelta.toFixed(2)}ms, ` +
        `CLS ${clsDelta.toFixed(4)}, FPS ${fps.toFixed(2)}`
      )
    }

    // Сохранение результатов
    if (!window.performanceResults) window.performanceResults = {}
    if (!window.performanceResults.update) window.performanceResults.update = []

    window.performanceResults.update.push({
      size: props.size,
      batchSize: props.batchSize,
      cycles: props.cycles,
      durations: [...durations.value],
      tbt: [...tbtValues.value],
      cls: [...clsValues.value],
      fps: [...fpsValues.value],
      avgDuration: avgDuration.value,
      medianDuration: medianDuration.value,
      avgTBT: avgTBT.value,
      avgCLS: avgCLS.value,
      avgFPS: avgFPS.value,
      timestamp: Date.now()
    })

    status.value = `Готово! Среднее: ${avgDuration.value.toFixed(2)}мс`
    console.log(`Update test completed: size ${props.size}`)

  } catch (error) {
    console.error('Update test error:', error)
    status.value = 'Ошибка: ' + error.message
  } finally {
    emit('test-completed')
  }
}

onMounted(runTest)
</script>

<style scoped>
.update-test {
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

.stats {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f0f8ff;
  border-radius: 4px;
}

.stats p {
  margin: 5px 0;
  font-size: 0.9em;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 15px;
}

th, td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #f8f8f8;
}
</style>
