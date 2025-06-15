<template>
  <div class="interaction-test">
    <div class="info">
      Пакет пользовательских действий: {{ cycles }} повторений | Первичный размер: {{ size }}
    </div>

    <div class="controls">
      <input v-model="filterText" placeholder="Filter by name" />
      <button @click="applyFilter">Применить</button>
    </div>

    <table v-if="displayData.length">
      <thead>
        <tr>
          <th @click="sortBy('id')">ID</th>
          <th @click="sortBy('name')">Name</th>
          <th @click="sortBy('value')">Value</th>
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
        <tr v-for="item in displayData" :key="`details-${item.id}`">
          <td colspan="4">
            <transition name="fade">
              <div v-if="expandedRow === item.id" class="details">
                Подробности для {{ item.name }}: значение {{ item.value.toFixed(2) }}
              </div>
            </transition>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="stats" v-if="durations.length">
      <p>Средняя длительность операции: {{ avgDuration.toFixed(2) }} мс</p>
      <p>Средний TBT: {{ avgTBT.toFixed(2) }} мс</p>
      <p>Средний CLS: {{ avgCLS.toFixed(4) }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, defineEmits } from 'vue'
import { generateDataset, waitForRender } from '@/utils/perf'

const props = defineProps({
  size: { type: Number, required: true },
  cycles: { type: Number, default: 20 }
})
const emit = defineEmits(['test-completed'])

const data = ref([])
const filterText = ref('')
const appliedFilter = ref('')
const sortKey = ref('')
const sortAsc = ref(true)
const expandedRow = ref(null)

const durations = ref([])
const tbtValues = ref([])
const clsValues = ref([])

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

const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
const avgDuration = computed(() => durations.value.length ? avg(durations.value) : 0)
const avgTBT = computed(() => tbtValues.value.length ? avg(tbtValues.value) : 0)
const avgCLS = computed(() => clsValues.value.length ? avg(clsValues.value) : 0)

function applyFilter() {
  appliedFilter.value = filterText.value
}
function sortBy(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else { sortKey.value = key; sortAsc.value = true }
}
function toggleDetails(id) {
  expandedRow.value = expandedRow.value === id ? null : id
}

async function runTest() {
  console.log(`🚀 Starting interaction test: size=${props.size}, cycles=${props.cycles}`)
  // Сброс предыдущих данных и метрик
  data.value = []
  durations.value = []
  tbtValues.value = []
  clsValues.value = []
  filterText.value = ''
  appliedFilter.value = ''
  sortKey.value = ''
  expandedRow.value = null

  // Первичный рендер
  data.value = generateDataset(props.size)
  await waitForRender()

  // Настройка наблюдателей
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

  try {
    for (let i = 0; i < props.cycles; i++) {
      const clsBefore = clsCumulative
      const tbtBefore = tbtCumulative

      performance.mark(`start-${i}`)
      // 1. Фильтрация
      filterText.value = data.value.length ? data.value[0].name : ''
      applyFilter()
      await nextTick()
      await waitForRender()

      // 2. Сортировка
      sortBy('value')
      await nextTick()
      await waitForRender()

      // 3. Разворачивание детали
      if (displayData.value.length) toggleDetails(displayData.value[0].id)
      await nextTick()
      await waitForRender()

      performance.mark(`end-${i}`)
      performance.measure(`dur-${i}`, `start-${i}`, `end-${i}`)
      const duration = performance.getEntriesByName(`dur-${i}`)[0].duration

      durations.value.push(duration)
      const tbtDelta = tbtCumulative - tbtBefore
      const clsDelta = clsCumulative - clsBefore
      tbtValues.value.push(tbtDelta)
      clsValues.value.push(clsDelta)

      console.log(
        `Interaction cycle ${i + 1}/${props.cycles} for size ${props.size}: ` +
        `${duration.toFixed(2)}ms, TBT ${tbtDelta.toFixed(2)}ms, ` +
        `CLS ${clsDelta.toFixed(4)}`
      )
    }

    // Сохранение результатов
    window.performanceResults.interaction.push({
      size: props.size,
      durations: [...durations.value],
      tbt: [...tbtValues.value],
      cls: [...clsValues.value]
    })
    console.log(`✅ Interaction test completed: size=${props.size}, avgDuration=${avgDuration.value.toFixed(2)}ms, avgTBT=${avgTBT.value.toFixed(2)}ms, avgCLS=${avgCLS.value.toFixed(4)}`)

  } catch (error) {
    console.error('Interaction test error:', error)
  } finally {
    clsObserver.disconnect()
    longTaskObserver.disconnect()
    emit('test-completed')
  }
}

onMounted(runTest)
watch(() => props.size, runTest)
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
  margin-bottom: 15px;
}
.controls input {
  padding: 6px 10px;
  margin-right: 10px;
}
.controls button {
  padding: 6px 12px;
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
  cursor: pointer;
}
tr:nth-child(even) {
  background-color: #f8f8f8;
}
tr:hover {
  background-color: #f0f7ff;
}
.details {
  padding: 10px;
  background-color: #eef;
  border-radius: 4px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
