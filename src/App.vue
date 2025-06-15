<template>
  <div id="app">
    <h1>Vue.js Performance Research</h1>

    <div class="test-container">
      <div v-if="currentTest" class="current-test">
        <h2>{{ currentTest.name }} - {{ currentTest.size }} элементов</h2>
        <component :is="currentTest.component" :size="currentTest.size" />
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
import { ref, computed, onMounted, markRaw } from 'vue'
import RenderTest from './components/RenderTest.vue'

// Конфигурация тестов с markRaw
const tests = [
  {
    id: 'render',
    name: 'Тест рендеринга',
    component: markRaw(RenderTest) // Используем markRaw
  }
]

const testSizes = [100, 1000, 5000, 10000]
const currentTest = ref(null)
const completedTests = ref(0)
const testStatus = ref({
  current: 'Подготовка к запуску',
  progress: 0,
  total: testSizes.length
})

// Вычисляемые свойства
const totalTests = computed(() => tests.length * testSizes.length)
const progress = computed(() => (completedTests.value / totalTests.value) * 100)

// Главная функция запуска тестов
const runAllTests = async () => {
  // Инициализируем глобальный объект для результатов
  window.performanceResults = {
    render: []
  }
  window.allTestsCompleted = false
  window.testStatus = {
    current: 'Запуск тестов',
    progress: 0,
    total: testSizes.length
  }

  // Последовательно запускаем все тесты
  for (const test of tests) {
    for (const size of testSizes) {
      // Устанавливаем текущий тест
      currentTest.value = { ...test, size }
      testStatus.value.current = `Выполнение: ${test.name} (${size} элементов)`
      window.testStatus.current = testStatus.value.current

      // Ждем монтирования компонента
      await new Promise(resolve => setTimeout(resolve, 100))

      try {
        // Ожидаем завершения теста с обработкой таймаута
        await new Promise((resolve, reject) => {
          // Устанавливаем обработчик завершения
          window.testCompleted = () => {
            clearTimeout(timeoutId)
            resolve()
          }

          // Таймаут на случай зависания теста
          const timeoutId = setTimeout(() => {
            reject(new Error(`Тест завис: ${test.name} (${size} элементов)`))
          }, 120000) // 2 минуты на тест
        })

        // Увеличиваем счетчик завершенных тестов
        completedTests.value++
        testStatus.value.progress = completedTests.value
        window.testStatus.progress = completedTests.value
        console.log(`✅ Тест завершен: ${test.name} (${size} элементов)`)
      } catch (error) {
        console.error(`❌ Ошибка теста: ${test.name} (${size} элементов)`, error)
        testStatus.value.current = `Ошибка: ${error.message}`
        window.testStatus.current = testStatus.value.current
      }
    }
  }

  // Все тесты завершены
  currentTest.value = null
  testStatus.value.current = 'Все тесты выполнены'
  console.log('🎉 Все тесты выполнены!')

  // Устанавливаем флаг завершения
  window.allTestsCompleted = true
}

// Запускаем тесты при монтировании компонента
onMounted(() => {
  // Небольшая задержка для инициализации
  setTimeout(runAllTests, 1000)
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
