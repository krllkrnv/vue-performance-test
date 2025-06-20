<template>
  <div class="realtime-test">
    <div class="info">
      Поступило записей: {{ data.length }}<br />
      Размер пакета: {{ size }} | Интервал: {{ interval }} мс
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Имя</th>
          <th>Значение</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.value.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, defineProps, watch } from 'vue'

const props = defineProps({
  size: { type: Number, default: 100 },
  interval: { type: Number, default: 500 },
  maxBatches: { type: Number, default: 10 }
})

const data = ref([])
let batchCount = 0
let timer = null

async function addBatch() {
  try {
    const res = await fetch(`/data/dataset-${props.size}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const batch = await res.json()
    const offset = data.value.length
    const mapped = batch.map(item => ({
      ...item,
      id: item.id + offset
    }))
    data.value.push(...mapped)
    batchCount++
    if (batchCount >= props.maxBatches) {
      clearInterval(timer)
    }
  } catch (err) {
    console.error('Не удалось загрузить пакет данных:', err)
    clearInterval(timer)
  }
}

function startStreaming() {
  data.value = []
  batchCount = 0
  clearInterval(timer)
  addBatch()
  timer = setInterval(addBatch, props.interval)
}

onMounted(startStreaming)
onBeforeUnmount(() => clearInterval(timer))

watch(
  () => [props.size, props.interval, props.maxBatches],
  () => startStreaming()
)
</script>

<style scoped>
.realtime-test {
  margin: 20px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fafafa;
}
.info {
  margin-bottom: 10px;
  font-weight: bold;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
thead th {
  background: #f2f2f2;
  position: sticky;
  top: 0;
}
tbody tr:nth-child(even) {
  background: #f8f8f8;
}
tbody tr:hover {
  background: #eef7ff;
}
</style>
