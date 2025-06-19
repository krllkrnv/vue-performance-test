<template>
  <div class="render-test">
    <div class="info">
      Тестирование первичного рендера: {{ size }} элементов
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
import { ref, onMounted, defineProps } from 'vue'
import { generateDataset } from '@/utils/perf'

const props = defineProps({ size: { type: Number, required: true } })
const data = ref([])

onMounted(() => {
  data.value = generateDataset(props.size)
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
