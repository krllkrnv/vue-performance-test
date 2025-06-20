import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '.lighthouseci');
const OUTPUT_CSV = path.join(__dirname, 'lighthouse-summary.csv');

const average = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

try {
    console.log(`🔍 Поиск отчётов в: ${REPORTS_DIR}`);

    // Проверка существования директории
    if (!fs.existsSync(REPORTS_DIR)) {
        throw new Error(`Директория ${REPORTS_DIR} не существует!`);
    }

    const reportFiles = fs.readdirSync(REPORTS_DIR).filter(file =>
        file.endsWith('.report.json') || file.endsWith('.json')
    );

    console.log(`📊 Найдено файлов отчётов: ${reportFiles.length}`);
    if (reportFiles.length === 0) {
        throw new Error('Файлы отчётов не найдены! Проверьте путь и расширения файлов.');
    }

    const reportsByUrl = {};
    let processedReports = 0;

    for (const file of reportFiles) {
        try {
            const reportPath = path.join(REPORTS_DIR, file);
            const rawData = fs.readFileSync(reportPath, 'utf8');
            const report = JSON.parse(rawData);

            // Проверка обязательных полей
            if (!report.finalUrl || !report.audits) {
                console.warn(`⚠️ Файл ${file} имеет неполную структуру`);
                continue;
            }

            const url = report.finalUrl;
            reportsByUrl[url] = reportsByUrl[url] || [];
            reportsByUrl[url].push(report);
            processedReports++;

        } catch (parseError) {
            console.error(`❌ Ошибка обработки файла ${file}:`, parseError.message);
        }
    }

    console.log(`✅ Успешно обработано отчётов: ${processedReports}/${reportFiles.length}`);

    if (processedReports === 0) {
        throw new Error('Ни один отчёт не был обработан!');
    }

    const summary = [];
    const metricsList = ['fcp', 'lcp', 'tbt', 'cls', 'performance'];

    for (const [url, reports] of Object.entries(reportsByUrl)) {
        const metrics = metricsList.reduce((acc, metric) => {
            acc[metric] = [];
            return acc;
        }, {});

        for (const report of reports) {
            try {
                metrics.fcp.push(report.audits['first-contentful-paint']?.numericValue || 0);
                metrics.lcp.push(report.audits['largest-contentful-paint']?.numericValue || 0);
                metrics.tbt.push(report.audits['total-blocking-time']?.numericValue || 0);
                metrics.cls.push(report.audits['cumulative-layout-shift']?.numericValue || 0);
                metrics.performance.push((report.categories.performance?.score || 0) * 100);
            } catch (e) {
                console.warn(`⚠️ Ошибка извлечения метрик для ${url}:`, e.message);
            }
        }

        summary.push({
            URL: url,
            Runs: reports.length,
            FCP_avg: average(metrics.fcp).toFixed(1),
            LCP_avg: average(metrics.lcp).toFixed(1),
            TBT_avg: average(metrics.tbt).toFixed(1),
            CLS_avg: average(metrics.cls).toFixed(3),
            Performance_avg: average(metrics.performance).toFixed(1)
        });
    }

    // Генерация CSV
    let csv = 'Scenario,Runs,FCP (ms),LCP (ms),TBT (ms),CLS,Performance (%)\n';

    for (const row of summary) {
        const scenario = row.URL.split('/').pop();
        csv += `${scenario},${row.Runs},${row.FCP_avg},${row.LCP_avg},${row.TBT_avg},${row.CLS_avg},${row.Performance_avg}\n`;
    }

    fs.writeFileSync(OUTPUT_CSV, csv);
    console.log(`\n🎉 Сводный отчёт сохранён в: ${OUTPUT_CSV}`);
    console.log('========================================');
    console.log('Результаты:');
    console.table(summary.map(s => ({
        Scenario: s.URL.split('/').pop(),
        Runs: s.Runs,
        FCP: `${s.FCP_avg} ms`,
        LCP: `${s.LCP_avg} ms`,
        TBT: `${s.TBT_avg} ms`,
        CLS: s.CLS_avg,
        Performance: `${s.Performance_avg}%`
    })));

} catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    process.exit(1);
}
