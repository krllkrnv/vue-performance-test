<template>
  <div class="render-test">
    <div class="info">
      Тестирование рендеринга: {{ size }} элементов
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
import { ref, watch, onMounted, defineEmits } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['test-completed'])
const data = ref([])

// Основная функция тестирования
const runTest = async () => {
  try {
    // 1. Очистка предыдущих данных
    data.value = []
    await waitForRender()

    // 2. Замер производительности
    const startTime = performance.now()

    // 3. Генерация и установка данных
    data.value = generateDataset(props.size)

    // 4. Ожидание рендеринга
    await waitForRender()

    // 5. Расчет метрик
    const duration = performance.now() - startTime
    const memoryUsed = performance.memory?.usedJSHeapSize || 0

    // 6. Сохранение результатов
    window.performanceResults.render.push({
      size: props.size,
      duration,
      memory: memoryUsed,
      timestamp: Date.now()
    })

    console.log(`Render test completed: ${props.size} items, ${duration.toFixed(2)}ms`)

  } catch (error) {
    console.error('Render test error:', error)
  } finally {
    emit('test-completed')
  }
}

onMounted(runTest)
watch(() => props.size, runTest)
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
