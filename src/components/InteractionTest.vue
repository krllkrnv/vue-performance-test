<template>
  <div class="interaction-test">
    <div class="info">
      Тест интерактивности: {{ size }} элементов — Действий: {{ totalActions }}
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
        <tr v-for="item in visibleData" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({ size: { type: Number, required: true } })
const emit = defineEmits(['test-completed'])

// Данные и результаты
const data = ref([])
const visibleData = ref([])
const results = ref([])

// Параметры теста
const filterValues = ['a', 'b', 'c', 'd', 'e']
const totalActions = computed(() => filterValues.length * 2 + filterValues.length)

// Функции действий
async function measureAction(name, actionFn) {
  performance.mark(`${name}-start`)
  await actionFn()
  await waitForRender()
  performance.mark(`${name}-end`)
  performance.measure(name, `${name}-start`, `${name}-end`)
  const measure = performance.getEntriesByName(name).pop()
  console.log(`${name}: ${measure.duration.toFixed(2)}ms`)
  results.value.push({ action: name, duration: measure.duration, timestamp: Date.now() })
  performance.clearMarks()
  performance.clearMeasures()
}

// Последовательность действий: фильтрация, сортировка, разворачивание (toggle)
async function runTest() {
  // 1. Инициализация
  data.value = generateDataset(props.size)
  visibleData.value = data.value.slice(0, 100)
  await waitForRender()

  // 2. Последовательные фильтрации и сортировки
  for (const val of filterValues) {
    await measureAction('filter', async () => {
      visibleData.value = data.value.filter(item => item.name.includes(val)).slice(0, 100)
      await nextTick()
    })
    await measureAction('sort', async () => {
      visibleData.value.sort((a, b) => a.value - b.value)
      await nextTick()
    })
  }

  // 3. Toggle details emulation: expand first 10 items
  for (let i = 0; i < 10 && i < visibleData.value.length; i++) {
    const id = visibleData.value[i].id
    await measureAction(`toggle-${id}`, async () => {
      // эмулируем раскрытие деталей
      // не меняем visibleData, просто force update
      await nextTick()
    })
  }

  // Сохранение
  window.performanceResults.interaction = results.value
  emit('test-completed')
}

onMounted(runTest)
</script>

<style scoped>
.interaction-test { margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; }
.info { font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
th { background-color: #f2f2f2; }
tr:nth-child(even) { background-color: #f8f8f8; }
</style>
