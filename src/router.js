import { createRouter, createWebHistory } from 'vue-router'
import RenderTest from './components/RenderTest.vue'
import UpdateTest from './components/UpdateTest.vue'
import InteractionTest from './components/InteractionTest.vue'

const testSizes = [100, 1000, 5000, 10000]

const routes = []

for (const size of testSizes) {
  routes.push(
    {
      path: `/render/${size}`,
      name: `render-${size}`,
      component: RenderTest,
      props: { size },
    },
    {
      path: `/update/${size}`,
      name: `update-${size}`,
      component: UpdateTest,
      props: { size },
    },
    {
      path: `/interaction/${size}`,
      name: `interaction-${size}`,
      component: InteractionTest,
      props: { size },
    }
  )
}

// Опционально: редирект корня на первый тест
routes.push({ path: '/', redirect: `/render/${testSizes[0]}` })

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
