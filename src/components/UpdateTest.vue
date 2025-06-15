<template>
  <div class="update-test">
    <div class="info">
      Тестирование обновлений: {{ size }} элементов | Обновлений: {{ updateCount }}
    </div>
    <div class="progress" v-if="testRunning">
      <div class="progress-bar" :style="{ width: batchProgress + '%' }"></div>
      <div class="progress-text">
        Пакет {{ currentBatch }}/{{ totalBatches }} ({{ updatesPerBatch }} элементов)
      </div>
    </div>
    <table v-if="data.length">
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
import { ref, onMounted, defineEmits, defineProps, computed } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['test-completed'])

const data = ref([])
const visibleData = ref([])
const updateCount = ref(0)
const testRunning = ref(true)
const currentBatch = ref(0)
const totalBatches = 20
const updatesPerBatch = computed(() => Math.max(1, Math.floor(props.size * 0.1)))

// Прогресс выполнения текущего теста
const batchProgress = computed(() => (currentBatch.value / totalBatches) * 100)

// Функция обновления случайных элементов
const updateRandomItems = async (count) => {
  const indexes = []
  for (let i = 0; i < count; i++) {
    indexes.push(Math.floor(Math.random() * props.size))
  }

  indexes.forEach(index => {
    if (data.value[index]) {
      data.value[index] = {
        ...data.value[index],
        value: Math.random() * 100,
        updateCount: data.value[index].updateCount + 1
      }
    }
  })

  // Обновляем видимые данные для реактивности
  visibleData.value = [...data.value.slice(0, 100)]
}

// Основная функция тестирования
const runTest = async () => {
  try {
    // 1. Инициализация данных
    testRunning.value = true
    currentBatch.value = 0
    data.value = generateDataset(props.size).map(item => ({
      ...item,
      updateCount: 0
    }))
    visibleData.value = [...data.value.slice(0, 100)]
    updateCount.value = 0

    await waitForRender()

    // 2. Замер производительности обновлений
    const testStart = performance.now()
    const updateDurations = []

    // 3. Выполняем серию обновлений
    for (let i = 0; i < totalBatches; i++) {
      currentBatch.value = i + 1
      const batchStart = performance.now()

      // Обновляем данные
      await updateRandomItems(updatesPerBatch.value)
      updateCount.value += updatesPerBatch.value

      // Ждем рендеринга
      await waitForRender()

      // Фиксируем время
      const batchDuration = performance.now() - batchStart
      updateDurations.push(batchDuration)

      // Небольшая пауза между пакетами
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // 4. Расчет метрик
    const totalDuration = performance.now() - testStart
    const avgDuration = updateDurations.reduce((sum, d) => sum + d, 0) / updateDurations.length
    const minDuration = Math.min(...updateDurations)
    const maxDuration = Math.max(...updateDurations)
    const memoryUsed = performance.memory?.usedJSHeapSize || 0

    // 5. Сохранение результатов
    if (!window.performanceResults.update) {
      window.performanceResults.update = []
    }

    window.performanceResults.update.push({
      size: props.size,
      batches: totalBatches,
      updatesPerBatch: updatesPerBatch.value,
      totalUpdates: totalBatches * updatesPerBatch.value,
      totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      memory: memoryUsed,
      timestamp: Date.now()
    })

    console.log(`✅ Update test completed: ${props.size} items, ${totalDuration.toFixed(2)}ms total`)

  } catch (error) {
    console.error('❌ Update test error:', error)
  } finally {
    testRunning.value = false
    // Сигнализируем о завершении теста
    emit('test-completed')
  }
}

onMounted(async () => {
  // Запускаем тест при монтировании
  await runTest()
})
</script>

<style scoped>
.update-test {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
  position: relative;
}

.info {
  font-weight: bold;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
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
