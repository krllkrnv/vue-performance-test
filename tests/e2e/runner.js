import fs from 'fs-extra'
import puppeteer from 'puppeteer'
import { generateCharts } from './chartGenerator.js'
import { generateReport } from './reportGenerator.js'

// Создаем папку для результатов
await fs.ensureDir('./results')

// Основная функция запуска тестов
async function runTests() {
  console.log('🚀 Запуск тестов производительности Vue.js')

  // Запускаем браузер
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--js-flags="--max-old-space-size=4096"'
    ]
  })

  const page = await browser.newPage()

  // Включаем сбор метрик производительности
  await page.evaluateOnNewDocument(() => {
    window.performanceResults = {
      render: [],
      update: [],
      interaction: []
    }
    window.allTestsCompleted = false
  })

  // Переходим к приложению
  await page.goto('http://localhost:8080', {
    waitUntil: 'networkidle0',
    timeout: 60000
  })

  // Ждем завершения всех тестов
  console.log('⏳ Ожидание завершения тестов...')
  await page.waitForFunction(() => window.allTestsCompleted, {
    timeout: 300000 // 5 минут
  })

  // Собираем результаты
  const results = await page.evaluate(() => window.performanceResults)
  console.log('✅ Все тесты завершены!')

  // Сохраняем сырые данные
  await fs.writeJson('./results/test-results.json', results)
  console.log('💾 Результаты сохранены в results/test-results.json')

  // Генерируем графики
  console.log('📊 Генерация графиков...')
  await generateCharts(results)

  // Генерируем отчет
  console.log('📝 Генерация отчета...')
  const report = generateReport(results)
  await fs.writeFile('./results/report.md', report)

  console.log('📄 Отчет сохранен в results/report.md')
  console.log('✨ Все задачи этапа 3 выполнены!')

  await browser.close()
}

// Запускаем тесты
runTests().catch(error => {
  console.error('❌ Ошибка при выполнении тестов:', error)
  process.exit(1)
})
