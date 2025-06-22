<template>
  <div class="render-test">
    <div class="info">
      Тестирование первичного рендера: {{ size }} элементов
    </div>

    <div ref="contentWrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Value</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody v-if="data.length">
          <tr v-for="item in data">
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.value.toFixed(2) }}</td>
            <td>{{ item.category }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, defineProps } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    required: true
  }
})
const data = ref([])

async function loadData(size) {
  try {
    const res = await fetch(`/data/dataset-${size}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch (err) {
    console.error('Не удалось загрузить данные:', err)
    data.value = []
  }
}

onMounted(() => {
  loadData(props.size)
})

watch(() => props.size, newSize => {
  loadData(newSize)
})
</script>
<style scoped>
.render-test {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #f9f9f9;
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
  margin-top: 12px;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}
th {
  background: #f2f2f2;
  position: sticky;
  top: 0;
}
tbody tr:nth-child(even) {
  background: #f8f8f8;
}
tbody tr:hover {
  background: #f0f7ff;
}
</style>
