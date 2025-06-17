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
import { ref, onMounted, defineEmits, defineProps, nextTick } from 'vue'
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

// Core Web Vitals: TBT и CLS
let tbt = 0
let cls = 0

function setupVitalsObservers() {
  const longTaskObs = new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.duration > 50) tbt += e.duration - 50
    }
  })
  longTaskObs.observe({ type: 'longtask', buffered: true })

  const clsObs = new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) cls += e.value
    }
  })
  clsObs.observe({ type: 'layout-shift', buffered: true })

  return () => {
    longTaskObs.disconnect()
    clsObs.disconnect()
  }
}

// Ждём два RAF, чтобы гарантировать конец отрисовки
function raf2() {
  return new Promise(r => {
    requestAnimationFrame(() => requestAnimationFrame(r))
  })
}

async function measureRender() {
  // 1) Прогрев
  status.value = 'Прогрев...'
  data.value = generateDataset(props.size)
  await raf2()

  // 2) Очистка
  status.value = 'Очистка...'
  data.value = []
  await raf2()

  // 3) Сброс пользовательских меток
  performance.clearMarks()
  performance.clearMeasures()

  // 4) Сброс Vitals
  tbt = 0
  cls = 0

  // 5) Старт наблюдателей
  const disconnectVitals = setupVitalsObservers()

  // 6) Метка начала рендера таблицы
  performance.mark('table-start')

  // 7) Основная вставка данных
  status.value = 'Измерение...'
  const startTime = performance.now()
  data.value = generateDataset(props.size)
  await nextTick()
  await raf2()
  const duration = performance.now() - startTime

  // 8) Метка конца рендера таблицы
  performance.mark('table-end')
  performance.measure('tableRender', 'table-start', 'table-end')
  const measure = performance.getEntriesByName('tableRender')[0]
  const tableRenderDuration = measure ? measure.duration : duration

  // 9) Отключаем наблюдателей
  disconnectVitals()

  return {
    duration,
    tableRenderDuration,
    tbt,
    cls,
    timestamp: Date.now()
  }
}

async function runTest() {
  status.value = 'Подготовка...'
  try {
    const metrics = await measureRender()

    window.performanceResults = window.performanceResults || {}
    window.performanceResults.render = window.performanceResults.render || []
    window.performanceResults.render.push({
      size: props.size,
      ...metrics
    })

    console.log(
      `Render test completed: ${props.size} items` +
      `, duration ${metrics.duration.toFixed(1)}ms` +
      `, table LCP ${metrics.tableRenderDuration.toFixed(1)}ms` +
      `, TBT ${metrics.tbt.toFixed(1)}ms` +
      `, CLS ${metrics.cls.toFixed(4)}`,
      metrics
    )
    status.value = `Готово: ${metrics.duration.toFixed(1)}ms`
  } catch (err) {
    console.error('Render test error:', err)
    status.value = 'Ошибка: ' + err.message
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
th, td {
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
