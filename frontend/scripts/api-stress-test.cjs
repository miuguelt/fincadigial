
const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:8092/api/v1'; // Auditar directamente el backend
const ENDPOINT = '/health'; // Endpoint público
const ITERATIONS = 100;
const CONCURRENCY = 10;

async function runStressTest() {
  console.log(`\n🚀 Iniciando Prueba de Estrés: ${ENDPOINT}`);
  console.log(`📊 Configuración: ${ITERATIONS} peticiones totales, ${CONCURRENCY} concurrentes\n`);

  const results = {
    success: 0,
    failed: 0,
    times: [],
    statuses: {}
  };

  const startTime = performance.now();

  for (let i = 0; i < ITERATIONS; i += CONCURRENCY) {
    const currentBatchSize = Math.min(CONCURRENCY, ITERATIONS - i);
    const promises = Array.from({ length: currentBatchSize }).map(async () => {
      const start = performance.now();
      try {
        const resp = await axios.get(`${BASE_URL}${ENDPOINT}`, {
          timeout: 5000,
          validateStatus: () => true 
        });
        const end = performance.now();
        results.times.push(end - start);
        if (resp.status < 400) results.success++;
        else results.failed++;
        results.statuses[resp.status] = (results.statuses[resp.status] || 0) + 1;
      } catch (e) {
        if (results.failed === 0) console.error('\n❌ Error de conexión:', e.message);
        results.failed++;
        const status = e.code || 'UNKNOWN';
        results.statuses[status] = (results.statuses[status] || 0) + 1;
      }
    });
    await Promise.all(promises);
    process.stdout.write(`.`);
  }

  const totalDuration = performance.now() - startTime;
  const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
  
  console.log(`\n\n✅ Prueba completada en ${(totalDuration / 1000).toFixed(2)}s`);
  console.table({
    'Total Peticiones': ITERATIONS,
    'Éxitos (<400)': results.success,
    'Fallos (>=400)': results.failed,
    'Tiempo Promedio (ms)': avgTime.toFixed(2),
    'Tiempo Máximo (ms)': Math.max(...results.times).toFixed(2),
    'Tiempo Mínimo (ms)': Math.min(...results.times).toFixed(2),
    'RPS (Req/sec)': (ITERATIONS / (totalDuration / 1000)).toFixed(2)
  });

  console.log('\n📡 Distribución de Estados:', results.statuses);
}

runStressTest().catch(console.error);
