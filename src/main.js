import { createApp } from 'vue'
import App from './App.vue'

// Создаем Vue-приложение
const app = createApp(App)

// Монтируем приложение в DOM
app.mount('#app')

// Инициализация глобальных переменных для управления тестами
window.performanceResults = {
  render: [],
  update: [],
  interaction: []
}

window.allTestsCompleted = false
window.testCompleted = null

// Для отладки в консоли браузера
if (process.env.NODE_ENV !== 'production') {
  console.debug('Vue Performance Research initialized')
  window.debugPerf = () => console.log(window.performanceResults)
}
