import fs from 'fs-extra'
import puppeteer from 'puppeteer'
import { generateCharts } from './chartGenerator.js'
import { generateReport } from './reportGenerator.js'

// Создаем папку для результатов
await fs.ensureDir('./results')

// Основная функция запуска тестов
async function runTests() {
  console.log('🚀 Запуск тестов производительности Vue.js')

  // Запускаем браузер с увеличенными таймаутами
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--js-flags="--max-old-space-size=4096"'
    ],
    protocolTimeout: 300000 // 5 минут
  })

  const page = await browser.newPage()

  // Устанавливаем таймауты по умолчанию
  await page.setDefaultNavigationTimeout(300000); // 5 минут
  await page.setDefaultTimeout(300000); // 5 минут

  // Включаем сбор метрик производительности
  await page.evaluateOnNewDocument(() => {
    window.performanceResults = {
      render: []
    }
    window.allTestsCompleted = false
    window.testStatus = {
      current: 'initializing',
      progress: 0,
      total: 0
    }
  })

  // Переходим к приложению
  console.log('🌐 Переход на страницу тестов...')
  await page.goto('http://frontend:5173', {
    waitUntil: 'networkidle0',
    timeout: 300000 // 5 минут
  })

  // Ждем завершения всех тестов
  console.log('⏳ Ожидание завершения тестов...')

  try {
    // Ожидаем флаг завершения с увеличенным таймаутом
    await page.waitForFunction(() => window.allTestsCompleted, {
      timeout: 300000, // 5 минут
      polling: 5000 // Проверяем каждые 5 секунд
    })

    console.log('✅ Все тесты завершены!')
  } catch (error) {
    console.error('❌ Ожидание завершения тестов прервано:', error)

    // Пытаемся получить текущий статус
    const status = await page.evaluate(() => window.testStatus?.current || 'unknown')
    console.error(`Последний статус тестов: ${status}`)

    throw new Error('Тесты не завершились в установленный срок')
  }

  // Собираем результаты
  const results = await page.evaluate(() => window.performanceResults)

  // Проверяем наличие результатов
  if (!results.render || results.render.length === 0) {
    console.warn('⚠️ Результаты тестов не получены!')
  } else {
    console.log(`📊 Получено ${results.render.length} результатов рендеринга`)
  }

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
  console.log('✨ Все задачи выполнены!')

  await browser.close()
}

// Запускаем тесты
runTests().catch(error => {
  console.error('❌ Критическая ошибка:', error.message)
  process.exit(1)
})
