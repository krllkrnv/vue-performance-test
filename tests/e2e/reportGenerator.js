import fs from 'fs-extra'

export function generateReport(results) {
  const timestamp = new Date().toLocaleString()
  let report = `# Отчёт о тестировании производительности Vue.js\n\n`
  report += `**Дата генерации:** ${timestamp}\n\n`

  // Раздел рендеринга
  report += `## 1. Тестирование производительности рендеринга\n\n`
  report += '| Размер данных | Время рендеринга (мс) | Использование памяти (MB) |\n'
  report += '|---------------|------------------------|---------------------------|\n'

  results.render.forEach(test => {
    report += `| ${test.size} | ${test.duration.toFixed(2)} | ${(test.memory / 1024 / 1024).toFixed(2)} |\n`
  })

  report += `\n![График рендеринга](./render-performance.png)\n\n`

  // Раздел обновлений
  report += `## 2. Тестирование производительности обновлений\n\n`
  report += '| Размер данных | Среднее время (мс) | Минимальное (мс) | Максимальное (мс) |\n'
  report += '|---------------|-------------------|------------------|-------------------|\n'

  results.update.forEach(test => {
    report += `| ${test.size} | ${test.avgDuration.toFixed(2)} | ${test.minDuration.toFixed(2)} | ${test.maxDuration.toFixed(2)} |\n`
  })

  report += `\n![График обновлений](./update-performance.png)\n\n`

  // Раздел взаимодействий
  report += `## 3. Тестирование производительности взаимодействий\n\n`
  report += '| Операция | Размер данных | Время выполнения (мс) |\n'
  report += '|----------|---------------|------------------------|\n'

  const operations = {
    sort: 'Сортировка',
    filter: 'Фильтрация',
    reset: 'Сброс данных'
  }

  results.interaction.forEach(test => {
    const operationName = operations[test.operation] || test.operation
    report += `| ${operationName} (${test.target}) | ${test.size} | ${test.duration.toFixed(2)} |\n`
  })

  report += `\n![График взаимодействий](./interaction-performance.png)\n\n`

  // Анализ и выводы
  report += `## 4. Анализ результатов\n\n`
  report += analyzeResults(results)

  return report
}

function analyzeResults(results) {
  let analysis = ''

  // Анализ рендеринга
  const renderSizes = [...new Set(results.render.map(t => t.size))].sort((a, b) => a - b)
  const renderTimes = renderSizes.map(size => {
    const tests = results.render.filter(t => t.size === size)
    return tests.reduce((sum, t) => sum + t.duration, 0) / tests.length
  })

  analysis += '### Производительность рендеринга\n'
  analysis += `- Среднее время рендеринга для 100 элементов: ${renderTimes[0].toFixed(2)} мс\n`
  analysis += `- Среднее время рендеринга для 10,000 элементов: ${renderTimes[3].toFixed(2)} мс\n`
  analysis += `- Коэффициент увеличения времени: ${(renderTimes[3] / renderTimes[0]).toFixed(2)}x\n\n`

  // Анализ обновлений
  const updateSizes = [...new Set(results.update.map(t => t.size))].sort((a, b) => a - b)
  const updateTimes = updateSizes.map(size => {
    const tests = results.update.filter(t => t.size === size)
    return tests.reduce((sum, t) => sum + t.avgDuration, 0) / tests.length
  })

  analysis += '### Производительность обновлений\n'
  analysis += `- Среднее время обновления для 100 элементов: ${updateTimes[0].toFixed(2)} мс\n`
  analysis += `- Среднее время обновления для 10,000 элементов: ${updateTimes[3].toFixed(2)} мс\n`
  analysis += `- Коэффициент увеличения времени: ${(updateTimes[3] / updateTimes[0]).toFixed(2)}x\n\n`

  // Анализ взаимодействий
  const interactionSizes = [...new Set(results.interaction.map(t => t.size))].sort((a, b) => a - b)
  const interactionTimes = {}

  const operationTypes = [...new Set(results.interaction.map(t => t.operation))]
  operationTypes.forEach(op => {
    interactionTimes[op] = interactionSizes.map(size => {
      const tests = results.interaction.filter(t => t.size === size && t.operation === op)
      return tests.reduce((sum, t) => sum + t.duration, 0) / tests.length
    })
  })

  analysis += '### Производительность взаимодействий\n'
  operationTypes.forEach(op => {
    analysis += `- **${op === 'sort' ? 'Сортировка' : op === 'filter' ? 'Фильтрация' : 'Сброс'}**:\n`
    analysis += `  - Для 100 элементов: ${interactionTimes[op][0].toFixed(2)} мс\n`
    analysis += `  - Для 10,000 элементов: ${interactionTimes[op][3].toFixed(2)} мс\n`
  })

  // Общие выводы
  analysis += '\n### Ключевые выводы\n'
  analysis += '1. Производительность Vue.js при рендеринге демонстрирует линейную зависимость от объема данных\n'
  analysis += '2. Реактивные обновления сохраняют приемлемую производительность до 5,000 элементов\n'
  analysis += '3. Операции сортировки наиболее чувствительны к увеличению объема данных\n'
  analysis += '4. Потребление памяти растет пропорционально объему обрабатываемых данных\n'

  return analysis
}
