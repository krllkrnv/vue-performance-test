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
        <template v-for="item in data">
          <tr>
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.value.toFixed(2) }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { generateDataset } from '@/utils/perf'

const props = defineProps({
  size: { type: Number, default: 100 },
  interval: { type: Number, default: 500 },
  maxBatches: { type: Number, default: 10 }
})

const data = ref([])
let batchCount = 0
let timer = null

function addBatch() {
  const newData = generateDataset(props.size, data.value.length)
  data.value.push(...newData)
  batchCount++
  if (batchCount >= props.maxBatches) clearInterval(timer)
}

onMounted(() => {
  addBatch()
  timer = setInterval(addBatch, props.interval)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.realtime-test {
  margin: 20px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.info {
  margin-bottom: 10px;
  font-weight: bold;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
}
</style>
