<template>
  <div id="app">
    <h1>Vue.js Performance Research</h1>

    <div class="info-panel" v-if="route.query.auto !== 'true'">
      <p>Автоматический режим отключен. Для последовательного запуска тестов добавьте <code>?auto=true</code> в URL</p>
    </div>

    <div class="test-container">
      <router-view @test-completed="onTestCompleted" />
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, watch } from 'vue'

const router = useRouter()
const route = useRoute()

const testSizes = [100, 1000, 5000, 10000]
const scenarios = ['render', 'update', 'interaction']

function onTestCompleted() {
  if (route.query.auto !== 'true') {
    console.log('Тест завершен. Автоматический переход отключен')
    return
  }

  const [scenario, sizeStr] = route.name.split('-')
  const currentSize = Number(sizeStr)
  const sizeIndex = testSizes.indexOf(currentSize)
  const scenarioIndex = scenarios.indexOf(scenario)

  let nextScenario = scenario
  let nextSize = currentSize

  if (sizeIndex < testSizes.length - 1) {
    nextSize = testSizes[sizeIndex + 1]
  }
  else if (scenarioIndex < scenarios.length - 1) {
    nextScenario = scenarios[scenarioIndex + 1]
    nextSize = testSizes[0]
  }
  else {
    alert('Все тесты выполнены! Результаты сохранены в папке /results')
    return
  }

  router.push({
    name: `${nextScenario}-${nextSize}`,
    query: { ...route.query }
  })
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
}

.info-panel {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 12px 20px;
  margin-bottom: 20px;
  border-radius: 0 4px 4px 0;
}

.info-panel p {
  margin: 0;
  font-size: 0.95rem;
}

.info-panel code {
  background-color: #e8f4ff;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

.test-container {
  min-height: 500px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #fafafa;
  margin-bottom: 20px;
}
</style>
