<template>
  <div class="update-test">
    <div class="info">
      Тестирование обновлений: {{ size }} элементов | Обновлений: {{ totalUpdates }}
    </div>

    <div class="stats" v-if="durations.length">
      <p>Среднее обновление: {{ avgDuration.toFixed(2) }} мс</p>
      <p>90-й перцентиль: {{ p90.toFixed(2) }} мс</p>
      <p>Минимум: {{ minDuration.toFixed(2) }} мс, Максимум: {{ maxDuration.toFixed(2) }} мс</p>
    </div>

    <div class="progress" v-if="running">
      <div class="progress-bar" :style="{ width: batchProgress + '%' }"></div>
      <div class="progress-text">
        Обновление {{ currentUpdate }}/{{ totalUpdates }}
      </div>
    </div>

    <table v-if="visibleData.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Value</th>
          <th>Updates</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in visibleData" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
          <td>{{ item.updateCount }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})
const emit = defineEmits(['test-completed'])

// Параметры теста
const data = ref([])
const visibleData = ref([])
const durations = ref([])

// Количество обновлений: 10% от размера
const totalUpdates = computed(() => Math.max(1, Math.floor(props.size * 0.1)))

// Счётчики прогресса
const currentUpdate = ref(0)
const running = ref(true)
const batchProgress = computed(() => (currentUpdate.value / totalUpdates.value) * 100)

// Метрики
const avgDuration = computed(() => durations.value.reduce((a, b) => a + b, 0) / durations.value.length)
const minDuration = computed(() => Math.min(...durations.value))
const maxDuration = computed(() => Math.max(...durations.value))

// Функция вычисления перцентиля
function percentile(arr, q) {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor((sorted.length - 1) * q)
  return sorted[idx]
}

const p90 = computed(() => percentile(durations.value, 0.9))

// Основной тест
async function runTest() {
  // 1. Инициализация данных
  data.value = generateDataset(props.size).map(item => ({ ...item, updateCount: 0 }))
  visibleData.value = data.value.slice(0, Math.min(props.size, 100))
  await waitForRender()

  // 2. Обновления
  for (let i = 0; i < totalUpdates.value; i++) {
    currentUpdate.value = i + 1
    const idx = Math.floor(Math.random() * props.size)

    const start = performance.now()
    data.value[idx].value = Math.random() * 100
    data.value[idx].updateCount += 1
    await nextTick()
    await waitForRender()

    const duration = performance.now() - start
    durations.value.push(duration)

    visibleData.value = data.value.slice(0, visibleData.value.length)
  }

  // 3. Логирование метрик
  console.log(
    `✅ Update test completed: ${props.size} items — ` +
    `avg ${avgDuration.value.toFixed(2)}ms, ` +
    `p90 ${p90.value.toFixed(2)}ms, ` +
    `min ${minDuration.value.toFixed(2)}ms, ` +
    `max ${maxDuration.value.toFixed(2)}ms`
  )

  // 4. Сохранение результатов
  window.performanceResults.update.push({
    size:         props.size,
    totalUpdates: totalUpdates.value,
    avgDuration:  avgDuration.value,
    p90:          p90.value,
    minDuration:  minDuration.value,
    maxDuration:  maxDuration.value,
    timestamp:    Date.now()
  })

  running.value = false
  emit('test-completed')
}


onMounted(() => runTest())
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
.progress {
  margin-bottom: 15px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.progress-bar {
  height: 20px;
  background-color: #3498db;
  transition: width 0.3s ease;
}
.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
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
