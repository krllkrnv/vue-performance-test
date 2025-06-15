<template>
  <div class="update-test">
    <div class="info">
      Циклическое обновление данных: {{ cycles }} циклов по {{ batchSize }} записей | Первичный размер: {{ size }}
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
import { ref, computed, onMounted, watch, nextTick, defineEmits } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

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

// Метрики вычисления
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
const median = arr => {
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const avgDuration = computed(() => durations.value.length ? avg(durations.value) : 0)
const medianDuration = computed(() => durations.value.length ? median(durations.value) : 0)
const avgTBT = computed(() => tbtValues.value.length ? avg(tbtValues.value) : 0)
const avgCLS = computed(() => clsValues.value.length ? avg(clsValues.value) : 0)
const avgFPS = computed(() => fpsValues.value.length ? avg(fpsValues.value) : 0)

async function runTest() {
  // Сброс предыдущих данных
  data.value = []
  durations.value = []
  tbtValues.value = []
  clsValues.value = []
  fpsValues.value = []

  // Первичный рендер
  data.value = generateDataset(props.size)
  await waitForRender()

  // Настройка PerformanceObserver для CLS и TBT
  let clsCumulative = 0
  const clsObserver = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) clsCumulative += entry.value
  })
  clsObserver.observe({ type: 'layout-shift', buffered: true })

  let tbtCumulative = 0
  const longTaskObserver = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) if (entry.duration > 50) tbtCumulative += entry.duration - 50
  })
  longTaskObserver.observe({ type: 'longtask', buffered: true })

  // Настройка Frame Timing API для FPS
  let frameCount = 0
  const frameObserver = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) frameCount++
  })
  frameObserver.observe({ type: 'frame', buffered: true })

  try {
    // Циклические обновления
    for (let i = 0; i < props.cycles; i++) {
      const clsBefore = clsCumulative
      const tbtBefore = tbtCumulative
      const framesBefore = frameCount

      performance.mark(`start-${i}`)
      data.value = [...data.value, ...generateDataset(props.batchSize)]
      await nextTick()
      await waitForRender()
      performance.mark(`end-${i}`)

      performance.measure(`dur-${i}`, `start-${i}`, `end-${i}`)
      const duration = performance.getEntriesByName(`dur-${i}`)[0].duration
      durations.value.push(duration)

      // Вычисление дельт метрик
      const tbtDelta = tbtCumulative - tbtBefore
      const clsDelta = clsCumulative - clsBefore
      const fpsDelta = (frameCount - framesBefore) / (duration / 1000)

      tbtValues.value.push(tbtDelta)
      clsValues.value.push(clsDelta)
      fpsValues.value.push(fpsDelta)

      console.log(
        `Update batch ${i + 1}/${props.cycles} for size ${props.size}: ` +
        `${duration.toFixed(2)}ms, TBT ${tbtDelta.toFixed(2)}ms, ` +
        `CLS ${clsDelta.toFixed(4)}, FPS ${fpsDelta.toFixed(2)}`
      )
    }

    // Сохранение результатов
    window.performanceResults.update.push({
      size: props.size,
      durations: [...durations.value],
      tbt: [...tbtValues.value],
      cls: [...clsValues.value],
      fps: [...fpsValues.value]
    })

    console.log(
      `Update test completed: size ${props.size}, ` +
      `avg ${avgDuration.value.toFixed(2)}ms, p50 ${medianDuration.value.toFixed(2)}ms, ` +
      `TBT ${avgTBT.value.toFixed(2)}ms, CLS ${avgCLS.value.toFixed(4)}, FPS ${avgFPS.value.toFixed(2)}`
    )
  } catch (error) {
    console.error('Update test error:', error)
  } finally {
    // Отключаем наблюдателей
    clsObserver.disconnect()
    longTaskObserver.disconnect()
    frameObserver.disconnect()
    emit('test-completed')
  }
}

onMounted(runTest)
watch(() => props.size, runTest)
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
}
.stats p {
  margin: 5px 0;
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
