<template>
  <div class="render-test">
    <div class="info">
      Тестирование первичного рендера: {{ size }} элементов
      <div v-if="status" class="status">{{ status }}</div>
    </div>
    <table ref="tableRef" v-if="data.length">
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

const props = defineProps({ size: { type: Number, required: true } })
const emit = defineEmits(['test-completed'])

const data = ref([])
const status = ref('')
const tableRef = ref(null)

let tbt = 0
let cls = 0
let fcp = 0
let lcp = 0
let peakMemory = 0

function raf2() {
  return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
}

async function measureRender() {
  status.value = 'Прогрев...'
  data.value = generateDataset(props.size)
  await raf2()

  status.value = 'Очистка...'
  data.value = []
  await raf2()

  performance.clearMarks()
  performance.clearMeasures()
  tbt = 0; cls = 0; fcp = 0; lcp = 0; peakMemory = 0

  // Инструменты
  const longTaskObs = new PerformanceObserver(list => {
    list.getEntries().forEach(e => { if (e.duration > 50) tbt += e.duration - 50 })
  })
  longTaskObs.observe({ type: 'longtask', buffered: true })

  const clsObs = new PerformanceObserver(list => {
    list.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value })
  })
  clsObs.observe({ type: 'layout-shift', buffered: true })

  // Снимок памяти до
  const memSamples = []
  function sampleMemory() {
    if (performance.memory) memSamples.push(performance.memory.usedJSHeapSize)
  }

  // Запуск замеров памяти каждые RAF в течение рендера
  let memSampling = true
  function memoryLoop() {
    if (!memSampling) return
    sampleMemory()
    requestAnimationFrame(memoryLoop)
  }

  // Начало замеров
  memSampling = true
  memoryLoop()

  performance.mark('start')
  const start = performance.now()
  status.value = 'Измерение...'

  // Рендер данных
  data.value = generateDataset(props.size)
  await nextTick()
  fcp = performance.now() - start

  await raf2()
  lcp = performance.now() - start

  performance.mark('end')
  performance.measure('render', 'start', 'end')
  const measure = performance.getEntriesByName('render')[0]
  const duration = measure.duration

  // Остановка замеров памяти
  memSampling = false
  peakMemory = memSamples.length ? Math.max(...memSamples) - (memSamples[0] || 0) : 0

  // Отключение обсерверов
  longTaskObs.disconnect()
  clsObs.disconnect()

  return { duration, tbt, cls, fcp, lcp, peakMemory, timestamp: Date.now() }
}

async function runTest() {
  status.value = 'Подготовка...'
  try {
    const m = await measureRender()
    window.performanceResults = window.performanceResults || {}
    window.performanceResults.render = window.performanceResults.render || []
    window.performanceResults.render.push({ size: props.size, ...m })

    console.log(
      `Render test completed: ${props.size} items, FCP ${m.fcp.toFixed(1)}ms, LCP ${m.lcp.toFixed(1)}ms, ` +
      `TBT ${m.tbt.toFixed(1)}ms, CLS ${m.cls.toFixed(4)}, Duration ${m.duration.toFixed(1)}ms, ` +
      `PeakMemory ${(m.peakMemory/1048576).toFixed(2)}MB`, m
    )
    status.value = `Готово: ${m.duration.toFixed(1)}ms`
  } catch (e) {
    console.error('Render test error:', e)
    status.value = 'Ошибка: ' + e.message
  } finally {
    emit('test-completed')
  }
}

onMounted(runTest)
</script>

<style scoped>
.render-test { margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 8px; background: #f9f9f9; }
.info { font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
.status { font-size: 0.9em; color: #666; margin-top: 5px; }
table { width:100%; border-collapse:collapse; font-size:14px; margin-top:12px; }
th, td { border:1px solid #ddd; padding:8px 12px; text-align:left; }
th { background:#f2f2f2; position:sticky; top:0; }
tbody tr:nth-child(even) { background:#f8f8f8; }
tbody tr:hover { background:#f0f7ff; }
</style>
