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

    <table v-if="getDisplayData().length">
      <thead>
        <tr v-if="expandedRow !== null">
          <td colspan="4">
              <div v-if="expandedRow !== null" class="details">
                Подробности для {{
                  data.find(item => item.id === expandedRow)?.name || ''
                }}:
                значение {{
                  (data.find(item => item.id === expandedRow)?.value || 0).toFixed(2)
                }}
              </div>
          </td>
        </tr>
        <tr>
          <th @click="sortBy('id')">
            ID
            {{ sortKey === 'id' ? (sortAsc ? '↑' : '↓') : '' }}
          </th>
          <th @click="sortBy('name')">
            Name
            {{ sortKey === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
          </th>
          <th @click="sortBy('value')">
            Value
            {{ sortKey === 'value' ? (sortAsc ? '↑' : '↓') : '' }}
          </th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in getDisplayData()" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
          <td>
            <button @click="toggleDetails(item.id)">Details</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits, defineProps } from 'vue'
import { generateDataset } from '../../utils/perf'

const props = defineProps({
  size: { type: Number, required: true },
  cycles: { type: Number, default: 5 }
})
const emit = defineEmits(['test-completed'])

const data = ref([])
const filterText = ref('')
const appliedFilter = ref('')
const sortKey = ref('')
const sortAsc = ref(true)
const expandedRow = ref(null)
const status = ref('')

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
const sleep = ms => new Promise(r => setTimeout(r, ms))

function applyFilter() {
  appliedFilter.value = filterText.value
}

function sortBy(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function toggleDetails(id) {
  expandedRow.value = expandedRow.value === id ? null : id
}

function getDisplayData() {
  let arr = data.value

  if (appliedFilter.value) {
    arr = arr.filter(item => item.name.includes(appliedFilter.value))
  }

  if (sortKey.value) {
    arr = [...arr].sort((a, b) => {
      const result = a[sortKey.value] > b[sortKey.value] ? 1 : (a[sortKey.value] < b[sortKey.value] ? -1 : 0)
      return sortAsc.value ? result : -result
    })
  }

  return arr
}

async function measureAction(action) {
  action.execute()
  await nextFrame()
  await sleep(400)
  if (action.reset) action.reset()
  await nextFrame()
  await sleep(400)
}

async function runTest() {
  await sleep(300)
  status.value = 'Подготовка...'

  try {
    data.value = generateDataset(props.size)
    await nextFrame()

    for (let i = 0; i < props.cycles; i++) {
      status.value = `Цикл ${i + 1}/${props.cycles}`
      const idx = Math.floor(Math.random() * data.value.length)

      const actions = [
        {
          execute: () => {
            filterText.value = data.value[idx].name
            applyFilter()
          },
          reset: () => {
            appliedFilter.value = ''
          }
        },
        {
          execute: () => sortBy(['id', 'name', 'value'][i % 3]),
          reset: () => {
            sortKey.value = ''
          }
        },
        {
          execute: () => toggleDetails(data.value[idx].id),
          reset: () => {
            expandedRow.value = null
          }
        }
      ].sort(() => 0.5 - Math.random())

      for (const action of actions) {
        await measureAction(action)
      }
    }

    status.value = 'Тестирование завершено!'
    emit('test-completed')
  } catch (error) {
    console.error(error)
    status.value = 'Ошибка: ' + error.message
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
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 15px;
}
th,
td {
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
