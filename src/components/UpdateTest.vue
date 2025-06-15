<template>
  <div class="update-test">
    <div class="info">
      Тестирование обновлений: {{ size }} элементов | Обновлений: {{ updateCount }}
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
import { ref, onMounted } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})

const data = ref([])
const visibleData = ref([])
const updateCount = ref(0)

// Функция обновления случайных элементов
const updateRandomItems = async (count) => {
  const indexes = []
  for (let i = 0; i < count; i++) {
    indexes.push(Math.floor(Math.random() * props.size))
  }

  indexes.forEach(index => {
    data.value[index] = {
      ...data.value[index],
      value: Math.random() * 100,
      updateCount: data.value[index].updateCount + 1
    }
  })

  // Для принудительного обновления реактивности
  visibleData.value = [...data.value.slice(0, 100)]
}

// Основная функция тестирования
const runTest = async () => {
  try {
    // 1. Инициализация данных
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

    // 3. Выполняем серию обновлений (10% от размера набора)
    const updatesPerBatch = Math.max(1, Math.floor(props.size * 0.1))
    const batches = 20

    for (let i = 0; i < batches; i++) {
      const batchStart = performance.now()

      // Обновляем данные
      await updateRandomItems(updatesPerBatch)
      updateCount.value += updatesPerBatch

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
      batches,
      updatesPerBatch,
      totalUpdates: batches * updatesPerBatch,
      totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      memory: memoryUsed,
      timestamp: Date.now()
    })

    console.log(`Update test completed: ${props.size} items, ${totalDuration.toFixed(2)}ms total`)

  } catch (error) {
    console.error('Update test error:', error)
  } finally {
    // Сигнализируем о завершении теста
    if (window.testCompleted) {
      window.testCompleted()
    }
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
}

.info {
  font-weight: bold;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

/* Остальные стили аналогичны RenderTest */
</style>
