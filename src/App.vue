<template>
  <div id="app">
    <h1>Vue.js Performance Research</h1>

    <div class="test-container">
      <div v-if="currentTest" class="current-test">
        <h2>{{ currentTest.name }} - {{ currentTest.size }} элементов</h2>
        <component
          :is="currentTest.component"
          :size="currentTest.size"
          @test-completed="handleTestCompleted"
          :key="currentTestKey"
        />
      </div>

      <div v-else class="completion-message">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
        <p>Все тесты завершены!</p>
        <p>Результаты сохранены в папке /results</p>
      </div>
    </div>

    <div class="status-bar">
      <div class="progress-text">
        Прогресс: {{ completedTests }}/{{ totalTests }} тестов
      </div>
      <div class="current-status" v-if="testStatus.current">
        Текущий статус: {{ testStatus.current }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, markRaw, nextTick } from 'vue'
import RenderTest from './components/RenderTest.vue'
import UpdateTest from './components/UpdateTest.vue' // Импорт нового компонента

// Конфигурация тестов с markRaw
const tests = [
  {
    id: 'render',
    name: 'Тест рендеринга',
    component: markRaw(RenderTest)
  },
  {
    id: 'update',
    name: 'Тест обновлений',
    component: markRaw(UpdateTest) // Добавление нового теста
  }
]

const testSizes = [100, 1000, 5000, 10000]
const currentTest = ref(null)
const currentTestKey = ref(0)
const completedTests = ref(0)
const testStatus = ref({
  current: 'Подготовка к запуску',
  progress: 0,
  total: testSizes.length * tests.length
})

// Вычисляемые свойства
const totalTests = computed(() => tests.length * testSizes.length)
const progress = computed(() => (completedTests.value / totalTests.value) * 100)

// Обработчик события завершения теста
const handleTestCompleted = () => {
  completedTests.value++
  testStatus.value.progress = completedTests.value
  window.testStatus.progress = completedTests.value
  console.log(`✅ Тест завершен: ${currentTest.value.name} (${currentTest.value.size} элементов)`)

  // Запускаем следующий тест
  runNextTest()
}

// Функция для запуска следующего теста
const runNextTest = async () => {
  await nextTick()

  const currentTestIndex = tests.findIndex(t => t.id === currentTest.value.id)
  const currentSizeIndex = testSizes.findIndex(s => s === currentTest.value.size)

  if (currentSizeIndex < testSizes.length - 1) {
    const nextSize = testSizes[currentSizeIndex + 1]
    currentTest.value = { ...tests[currentTestIndex], size: nextSize }
    currentTestKey.value++
    testStatus.value.current = `Выполнение: ${tests[currentTestIndex].name} (${nextSize} элементов)`
    window.testStatus.current = testStatus.value.current
    return
  }

  if (currentTestIndex < tests.length - 1) {
    const nextTest = tests[currentTestIndex + 1]
    currentTest.value = { ...nextTest, size: testSizes[0] }
    currentTestKey.value++
    testStatus.value.current = `Выполнение: ${nextTest.name} (${testSizes[0]} элементов)`
    window.testStatus.current = testStatus.value.current
    return
  }

  currentTest.value = null
  testStatus.value.current = 'Все тесты выполнены'
  console.log('🎉 Все тесты выполнены!')
  window.allTestsCompleted = true
}

// Главная функция запуска тестов
const runAllTests = () => {
  window.performanceResults = {
    render: [],
    update: [] // Добавлено хранилище для результатов UpdateTest
  }
  window.allTestsCompleted = false
  window.testStatus = {
    current: 'Запуск тестов',
    progress: 0,
    total: testSizes.length * tests.length
  }

  currentTest.value = { ...tests[0], size: testSizes[0] }
  currentTestKey.value = 1
  testStatus.value.current = `Выполнение: ${tests[0].name} (${testSizes[0]} элементов)`
  window.testStatus.current = testStatus.value.current
}

onMounted(() => {
  setTimeout(runAllTests, 100)
})
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

.test-container {
  min-height: 500px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #fafafa;
  margin-bottom: 20px;
}

.current-test h2 {
  color: #3498db;
  margin-bottom: 20px;
  text-align: center;
}

.completion-message {
  text-align: center;
  padding: 40px 20px;
}

.completion-message p {
  font-size: 1.2rem;
  margin: 10px 0;
}

.completion-message p:first-of-type {
  font-weight: bold;
  font-size: 1.5rem;
  color: #27ae60;
  margin-top: 30px;
}

.progress-bar {
  height: 10px;
  background-color: #2ecc71;
  border-radius: 5px;
  margin: 0 auto 30px;
  max-width: 600px;
  transition: width 0.5s ease;
}

.status-bar {
  background-color: #f5f5f5;
  padding: 10px 15px;
  border-radius: 5px;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-weight: bold;
}

.current-status {
  font-style: italic;
  color: #666;
}
</style>
