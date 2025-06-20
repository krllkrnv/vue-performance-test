import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

// Создаем Vue-приложение
const app = createApp(App)

// Монтируем приложение в DOM
app.use(router)
app.mount('#app')
