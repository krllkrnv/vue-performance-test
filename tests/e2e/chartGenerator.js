import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import fs from 'fs-extra'

// Конфигурация рендерера
const width = 1200
const height = 800
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height })

export async function generateCharts(results) {
  await generateChart(
    results.render,
    'Размер набора данных',
    'Время рендеринга (мс)',
    'Производительность рендеринга',
    'render-performance.png',
    d => d.size,
    d => d.duration
  )

  await generateChart(
    results.update,
    'Размер набора данных',
    'Среднее время обновления (мс)',
    'Производительность обновлений',
    'update-performance.png',
    d => d.size,
    d => d.avgDuration
  )

  await generateChart(
    results.interaction,
    'Размер набора данных',
    'Среднее время операции (мс)',
    'Производительность взаимодействий',
    'interaction-performance.png',
    d => d.size,
    d => {
      const operations = results.interaction.filter(r => r.size === d.size)
      return operations.reduce((sum, op) => sum + op.duration, 0) / operations.length
    }
  )
}

async function generateChart(data, xLabel, yLabel, title, filename, getX, getY) {
  if (!data.length) return

  const grouped = {}
  data.forEach(item => {
    const key = getX(item)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(getY(item))
  })

  const labels = []
  const values = []

  Object.keys(grouped)
    .sort((a, b) => a - b)
    .forEach(size => {
      const items = grouped[size]
      const avg = items.reduce((sum, val) => sum + val, 0) / items.length
      labels.push(`${size} элементов`)
      values.push(avg)
    })

  const configuration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: yLabel,
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18
          }
        },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} мс`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yLabel,
            font: {
              size: 14
            }
          },
          ticks: {
            callback: value => `${value} мс`
          }
        },
        x: {
          title: {
            display: true,
            text: xLabel,
            font: {
              size: 14
            }
          }
        }
      }
    }
  }

  const image = await chartJSNodeCanvas.renderToBuffer(configuration)
  await fs.writeFile(`./results/${filename}`, image)
  console.log(`📈 График сохранен: results/${filename}`)
}
