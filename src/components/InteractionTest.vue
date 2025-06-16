<template>
  <div class="interaction-test">
    <div class="info">
      Пакет пользовательских действий: {{ cycles }} повторений | Первичный размер: {{ size }}
      <div v-if="status" class="status">{{ status }}</div>
    </div>

    <div class="controls">
      <input v-model="filterText" placeholder="Filter by name" />
      <button @click="applyFilter">Применить</button>
    </div>

    <div class="stats" v-if="resultsReady">
      <div class="action-stats" v-for="(action, name) in stats" :key="name">
        <h3>{{ getActionName(name) }}</h3>
        <p>Среднее время: {{ action.avgDuration.toFixed(2) }} мс</p>
        <p>Средний TBT: {{ action.avgTBT.toFixed(2) }} мс</p>
        <p>Средний CLS: {{ action.avgCLS.toFixed(4) }}</p>
      </div>
    </div>

    <table v-if="displayData.length">
      <thead>
        <tr>
          <th @click="sortBy('id')">ID {{ sortIndicator('id') }}</th>
          <th @click="sortBy('name')">Name {{ sortIndicator('name') }}</th>
          <th @click="sortBy('value')">Value {{ sortIndicator('value') }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in displayData" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
          <td><button @click="toggleDetails(item.id)">Details</button></td>
        </tr>
        <tr v-if="expandedRow !== null">
          <td colspan="4">
            <transition name="fade">
              <div v-if="expandedRow !== null" class="details">
                Подробности для {{ getItemName(expandedRow) }}: значение {{ getItemValue(expandedRow).toFixed(2) }}
              </div>
            </transition>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineEmits, defineProps } from 'vue'
import { generateDataset } from '@/utils/perf'

const props = defineProps({
  size: { type: Number, required: true },
  cycles: { type: Number, default: 20 }
})
const emit = defineEmits(['test-completed'])

// Состояние компонента
const data = ref([])
const filterText = ref('')
const appliedFilter = ref('')
const sortKey = ref('')
const sortAsc = ref(true)
const expandedRow = ref(null)
const status = ref('')

// Результаты тестов
const filterResults = ref({ durations: [], tbt: [], cls: [] })
const sortResults = ref({ durations: [], tbt: [], cls: [] })
const expandResults = ref({ durations: [], tbt: [], cls: [] })
const resultsReady = ref(false)

// Статистика
const stats = computed(() => ({
  filter: {
    avgDuration: avg(filterResults.value.durations),
    avgTBT: avg(filterResults.value.tbt),
    avgCLS: avg(filterResults.value.cls)
  },
  sort: {
    avgDuration: avg(sortResults.value.durations),
    avgTBT: avg(sortResults.value.tbt),
    avgCLS: avg(sortResults.value.cls)
  },
  expand: {
    avgDuration: avg(expandResults.value.durations),
    avgTBT: avg(expandResults.value.tbt),
    avgCLS: avg(expandResults.value.cls)
  }
}))

// Вспомогательные функции
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
const getActionName = name => ({
  filter: 'Фильтрация',
  sort: 'Сортировка',
  expand: 'Раскрытие деталей'
}[name])

const getItemName = id => data.value.find(item => item.id === id)?.name || ''
const getItemValue = id => data.value.find(item => item.id === id)?.value || 0

const displayData = computed(() => {
  let arr = data.value
  if (appliedFilter.value) {
    arr = arr.filter(item => item.name.includes(appliedFilter.value))
  }
  if (sortKey.value) {
    arr = [...arr].sort((a, b) => {
      const res = a[sortKey.value] > b[sortKey.value] ? 1 : (a[sortKey.value] < b[sortKey.value] ? -1 : 0)
      return sortAsc.value ? res : -res
    })
  }
  return arr
})

const sortIndicator = key => {
  if (sortKey.value !== key) return ''
  return sortAsc.value ? '↑' : '↓'
}

// Основные функции
function applyFilter() {
  appliedFilter.value = filterText.value
}

function sortBy(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function toggleDetails(id) {
  expandedRow.value = expandedRow.value === id ? null : id
}

// Ожидание полного цикла рендеринга
const waitForAnimationFrame = () => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

// Настройка наблюдателей производительности
const setupObservers = () => {
  let tbt = 0
  let cls = 0

  const longTaskObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.duration > 50) tbt += entry.duration - 50
    })
  })
  longTaskObserver.observe({ type: "longtask", buffered: true })

  const clsObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) cls += entry.value
    })
  })
  clsObserver.observe({ type: "layout-shift", buffered: true })

  return {
    getMetrics: () => ({ tbt, cls }),
    disconnect: () => {
      longTaskObserver.disconnect()
      clsObserver.disconnect()
    }
  }
}

// Измерение производительности одного действия
const measureAction = async (action) => {
  const observers = setupObservers()
  const beforeMetrics = observers.getMetrics()
  const start = performance.now()

  // Выполняем действие
  action.execute()

  // Ожидаем завершения рендеринга
  await waitForAnimationFrame()

  const duration = performance.now() - start
  const afterMetrics = observers.getMetrics()
  observers.disconnect()

  // Сбрасываем состояние
  if (action.reset) action.reset()
  await waitForAnimationFrame()

  return {
    duration,
    tbt: afterMetrics.tbt - beforeMetrics.tbt,
    cls: afterMetrics.cls - beforeMetrics.cls
  }
}

// Основная функция тестирования
async function runTest() {
  status.value = 'Подготовка...'
  resultsReady.value = false
  filterResults.value = { durations: [], tbt: [], cls: [] }
  sortResults.value = { durations: [], tbt: [], cls: [] }
  expandResults.value = { durations: [], tbt: [], cls: [] }

  try {
    // Инициализация данных
    data.value = generateDataset(props.size)
    await waitForAnimationFrame()

    // Прогревочные операции
    status.value = 'Прогрев...'
    await Promise.all([
      measureAction({
        execute: () => {
          filterText.value = data.value[0].name
          applyFilter()
        },
        reset: () => { appliedFilter.value = '' }
      }),
      measureAction({
        execute: () => sortBy('value'),
        reset: () => { sortKey.value = '' }
      }),
      measureAction({
        execute: () => toggleDetails(data.value[0].id),
        reset: () => { expandedRow.value = null }
      })
    ])

    // Основные измерения
    status.value = `Выполнение тестов (0/${props.cycles})...`

    for (let i = 0; i < props.cycles; i++) {
      status.value = `Цикл ${i + 1}/${props.cycles}...`

      // Фильтрация
      const filterResult = await measureAction({
        execute: () => {
          filterText.value = data.value[Math.floor(Math.random() * data.value.length)].name
          applyFilter()
        },
        reset: () => { appliedFilter.value = '' }
      })
      filterResults.value.durations.push(filterResult.duration)
      filterResults.value.tbt.push(filterResult.tbt)
      filterResults.value.cls.push(filterResult.cls)

      // Сортировка
      const sortResult = await measureAction({
        execute: () => sortBy(['id', 'name', 'value'][i % 3]),
        reset: () => { sortKey.value = '' }
      })
      sortResults.value.durations.push(sortResult.duration)
      sortResults.value.tbt.push(sortResult.tbt)
      sortResults.value.cls.push(sortResult.cls)

      // Раскрытие деталей
      const expandResult = await measureAction({
        execute: () => toggleDetails(data.value[Math.floor(Math.random() * data.value.length)].id),
        reset: () => { expandedRow.value = null }
      })
      expandResults.value.durations.push(expandResult.duration)
      expandResults.value.tbt.push(expandResult.tbt)
      expandResults.value.cls.push(expandResult.cls)
    }

    // Сохранение результатов
    if (!window.performanceResults) window.performanceResults = {}
    if (!window.performanceResults.interaction) window.performanceResults.interaction = []

    window.performanceResults.interaction.push({
      size: props.size,
      cycles: props.cycles,
      filter: { ...filterResults.value },
      sort: { ...sortResults.value },
      expand: { ...expandResults.value },
      timestamp: Date.now()
    })

    status.value = 'Тестирование завершено!'
    resultsReady.value = true
    console.log('✅ Interaction test completed')

  } catch (error) {
    console.error('Interaction test error:', error)
    status.value = 'Ошибка: ' + error.message
  } finally {
    emit('test-completed')
  }
}

onMounted(runTest)
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
  position: relative;
}

.status {
  font-weight: normal;
  font-size: 0.9em;
  color: #666;
  margin-top: 5px;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}

.controls input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.controls button {
  padding: 8px 16px;
  background-color: #4a7cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.controls button:hover {
  background-color: #3a6ae8;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.action-stats {
  padding: 15px;
  background-color: #f0f8ff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.action-stats h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
  border-bottom: 1px solid #d0e0ff;
  padding-bottom: 5px;
}

.action-stats p {
  margin: 8px 0;
  font-size: 0.9em;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 15px;
}

th, td {
  border: 1px solid #ddd;
  padding: 10px 15px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
  cursor: pointer;
  position: relative;
  user-select: none;
}

th:hover {
  background-color: #e6e6e6;
}

tr:nth-child(even) {
  background-color: #f8f8f8;
}

tr:hover {
  background-color: #f0f7ff;
}

.details {
  padding: 12px;
  background-color: #eef;
  border-radius: 4px;
  margin: 5px 0;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
