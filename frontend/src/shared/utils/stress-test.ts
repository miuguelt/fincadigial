
import { api } from './src/shared/api/base-client';

async function stressTest(endpoint: string, iterations: number, concurrency: number) {
  console.log(`[StressTest] Starting on ${endpoint} with ${iterations} total requests (${concurrency} concurrent)`);
  
  const results = {
    success: 0,
    failed: 0,
    times: [] as number[],
    statuses: {} as Record<number, number>
  };

  const runBatch = async (batchSize: number) => {
    const promises = Array.from({ length: batchSize }).map(async () => {
      const start = performance.now();
      try {
        const resp = await api.get(endpoint);
        const end = performance.now();
        results.times.push(end - start);
        results.success++;
        results.statuses[resp.status] = (results.statuses[resp.status] || 0) + 1;
      } catch (e: any) {
        results.failed++;
        const status = e.response?.status || 0;
        results.statuses[status] = (results.statuses[status] || 0) + 1;
      }
    });
    await Promise.all(promises);
  };

  const batches = Math.ceil(iterations / concurrency);
  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(concurrency, iterations - (i * concurrency));
    await runBatch(currentBatchSize);
  }

  const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
  const maxTime = Math.max(...results.times);
  const minTime = Math.min(...results.times);

  console.table({
    Endpoint: endpoint,
    Total: iterations,
    Success: results.success,
    Failed: results.failed,
    'Avg Time (ms)': avgTime.toFixed(2),
    'Max Time (ms)': maxTime.toFixed(2),
    'Min Time (ms)': minTime.toFixed(2)
  });
  
  console.log('[StressTest] Status Distribution:', results.statuses);
}

// Para ejecutar en consola:
// window.runStressTest = stressTest;
