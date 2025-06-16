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

// Ожидание полного цикла рендеринга
const waitForAnimationFrame = () => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(performance.now())
      })
    })
  })
}

// Точный замер рендеринга
const measureRender = async () => {
  // 1. Прогревочный рендер
  status.value = 'Прогрев...'
  data.value = generateDataset(props.size)
  await waitForAnimationFrame()

  // 2. Очистка для теста
  status.value = 'Очистка...'
  data.value = []
  await waitForAnimationFrame()

  // 3. Генерация данных (вне замера времени)
  const dataset = generateDataset(props.size)

  // 4. Замер основного рендеринга
  status.value = 'Измерение...'
  const renderStart = performance.now()

  // Инициируем рендеринг
  data.value = dataset

  // Ожидаем завершения рендеринга
  const renderEnd = await waitForAnimationFrame()

  // 5. Расчет метрик
  const duration = renderEnd - renderStart
  const memoryUsed = performance.memory?.usedJSHeapSize || 0

  return {
    duration,
    memory: memoryUsed
  }
}

// Основная функция тестирования
const runTest = async () => {
  status.value = 'Подготовка...'

  try {
    // Запускаем замер
    const metrics = await measureRender()

    // Сохранение результатов
    if (!window.performanceResults) window.performanceResults = {}
    if (!window.performanceResults.render) window.performanceResults.render = []

    window.performanceResults.render.push({
      size: props.size,
      duration: metrics.duration,
      memory: metrics.memory,
      timestamp: Date.now()
    })

    console.log(`Render test completed: ${props.size} items, ${metrics.duration.toFixed(2)}ms`)
    status.value = `Готово: ${metrics.duration.toFixed(2)}ms`

  } catch (error) {
    console.error('Render test error:', error)
    status.value = 'Ошибка: ' + error.message
  } finally {
    // Важное исправление: эмит события без задержки
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
