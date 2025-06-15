<template>
  <div class="interaction-test">
    <div class="info">
      Тестирование взаимодействий: {{ size }} элементов
    </div>

    <div class="controls">
      <button @click="sortById">Сортировать по ID</button>
      <button @click="sortByName">Сортировать по имени</button>
      <button @click="sortByValue">Сортировать по значению</button>
      <button @click="filterByCategory">Фильтровать по категории</button>
      <button @click="resetData">Сбросить</button>
    </div>

    <table v-if="filteredData.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Value</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in visibleData" :key="item.id">
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
import { ref, computed, onMounted } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})

const originalData = ref([])
const filteredData = ref([])
const visibleData = ref([])
const currentCategory = ref('')
const testCompleted = ref(false)

// Инициализация данных
const initializeData = () => {
  originalData.value = generateDataset(props.size)
  filteredData.value = [...originalData.value]
  visibleData.value = [...filteredData.value.slice(0, 100)]
  currentCategory.value = ''
}

// Функция измерения времени операции
const measureInteraction = async (operation) => {
  const startTime = performance.now()
  await operation()
  await waitForRender()
  return performance.now() - startTime
}

// Операции взаимодействия
const sortById = async () => {
  const duration = await measureInteraction(() => {
    filteredData.value.sort((a, b) => a.id - b.id)
  })
  saveResult('sort', 'id', duration)
}

const sortByName = async () => {
  const duration = await measureInteraction(() => {
    filteredData.value.sort((a, b) => a.name.localeCompare(b.name))
  })
  saveResult('sort', 'name', duration)
}

const sortByValue = async () => {
  const duration = await measureInteraction(() => {
    filteredData.value.sort((a, b) => a.value - b.value)
  })
  saveResult('sort', 'value', duration)
}

const filterByCategory = async () => {
  const categories = [...new Set(originalData.value.map(item => item.category))]
  const randomCategory = categories[Math.floor(Math.random() * categories.length)]

  const duration = await measureInteraction(() => {
    filteredData.value = originalData.value.filter(item => item.category === randomCategory)
    currentCategory.value = randomCategory
  })

  saveResult('filter', `category: ${randomCategory}`, duration)
}

const resetData = async () => {
  const duration = await measureInteraction(() => {
    filteredData.value = [...originalData.value]
    currentCategory.value = ''
  })
  saveResult('reset', 'all data', duration)
}

// Сохранение результатов
const saveResult = (type, field, duration) => {
  if (!window.performanceResults.interaction) {
    window.performanceResults.interaction = []
  }

  window.performanceResults.interaction.push({
    size: props.size,
    operation: type,
    target: field,
    duration,
    itemsAffected: type === 'filter' ? filteredData.value.length : props.size,
    timestamp: Date.now()
  })
}

// Основная функция тестирования
const runTest = async () => {
  try {
    // 1. Инициализация данных
    initializeData()
    await waitForRender()

    // 2. Выполняем серию взаимодействий
    await sortById()
    await sortByName()
    await sortByValue()
    await filterByCategory()
    await resetData()

    console.log(`Interaction test completed for ${props.size} items`)

  } catch (error) {
    console.error('Interaction test error:', error)
  } finally {
    testCompleted.value = true
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
.interaction-test {
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

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.controls button {
  padding: 8px 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.controls button:hover {
  background-color: #2980b9;
}

/* Остальные стили таблицы аналогичны предыдущим компонентам */
</style>
