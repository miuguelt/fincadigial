/**
 * Script de diagnóstico para operaciones de sincronización atascadas
 * Ejecutar en la consola del navegador (DevTools) mientras la app está abierta
 */

// 1. Abrir IndexedDB y ver todas las operaciones pendientes
const DB_NAME = 'VillaLuzQueue';
const STORE_NAME = 'offlineQueue';

async function diagnosticarOperacionesAtascadas() {
  console.log('=== DIAGNÓSTICO DE OPERACIONES ATASCADAS ===\n');
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = () => {
      console.error('❌ Error abriendo IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAll = store.getAll();
      
      getAll.onsuccess = () => {
        const operaciones = getAll.result;
        
        console.log(`📊 Total de operaciones en cola: ${operaciones.length}\n`);
        
        if (operaciones.length === 0) {
          console.log('✅ No hay operaciones pendientes');
          db.close();
          resolve(operaciones);
          return;
        }
        
        // Agrupar por estado
        const porEstado = {};
        operaciones.forEach(op => {
          if (!porEstado[op.status]) porEstado[op.status] = [];
          porEstado[op.status].push(op);
        });
        
        console.log('📋 Operaciones por estado:');
        Object.entries(porEstado).forEach(([estado, ops]) => {
          console.log(`  - ${estado}: ${ops.length}`);
        });
        console.log();
        
        // Mostrar detalles de cada operación
        console.log('🔍 Detalles de operaciones:\n');
        operaciones.forEach((op, index) => {
          console.log(`[${index + 1}] ID: ${op.id}`);
          console.log(`    Método: ${op.method}`);
          console.log(`    URL: ${op.url}`);
          console.log(`    Estado: ${op.status}`);
          console.log(`    Reintentos: ${op.retries}/${op.maxRetries}`);
          console.log(`    Timestamp: ${new Date(op.timestamp).toLocaleString('es-CO')}`);
          
          if (op.nextAttemptAt) {
            const espera = op.nextAttemptAt - Date.now();
            if (espera > 0) {
              console.log(`    ⏳ Próximo intento en: ${Math.ceil(espera / 1000)}s`);
            }
          }
          
          if (op.error) {
            console.log(`    ❌ Error: ${op.error}`);
          }
          
          // Verificar si tiene metadata v2
          if (op.entityType) {
            console.log(`    📦 Entidad: ${op.entityType}`);
            console.log(`    🔧 Operación: ${op.operation}`);
          } else {
            console.log(`    ⚠️  Sin metadata v2 (entityType/operation)`);
          }
          
          console.log();
        });
        
        // Operaciones potencialmente atascadas
        const ahora = Date.now();
        const atascadas = operaciones.filter(op => {
          // pending con nextAttemptAt muy lejano
          if (op.status === 'pending' && op.nextAttemptAt && op.nextAttemptAt - ahora > 60000) {
            return true;
          }
          // failed
          if (op.status === 'failed') return true;
          // muchos reintentos
          if (op.retries > 5) return true;
          return false;
        });
        
        if (atascadas.length > 0) {
          console.log(`⚠️  ${atascadas.length} operaciones potencialmente atascadas:`);
          atascadas.forEach(op => {
            console.log(`  - ${op.id} (${op.status}, ${op.retries} reintentos)`);
          });
        }
        
        db.close();
        resolve(operaciones);
      };
      
      getAll.onerror = () => {
        console.error('❌ Error leyendo operaciones:', getAll.error);
        db.close();
        reject(getAll.error);
      };
    };
  });
}

// 2. Función para forzar sincronización inmediata (saltándose nextAttemptAt)
async function forzarSincronizacionInmediata() {
  console.log('🔄 Forzando sincronización inmediata...\n');
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      store.getAll().onsuccess = (e) => {
        const operaciones = e.target.result;
        let modificadas = 0;
        
        operaciones.forEach(op => {
          if (op.status === 'pending' || op.status === 'failed') {
            op.status = 'pending';
            op.retries = 0;
            op.nextAttemptAt = undefined;
            op.error = undefined;
            store.put(op);
            modificadas++;
          }
        });
        
        tx.oncomplete = () => {
          console.log(`✅ ${modificadas} operaciones reseteadas para reintentar`);
          console.log('💡 Ahora haz click en "Sincronizar" en la UI');
          db.close();
          resolve(modificadas);
        };
        
        tx.onerror = () => {
          console.error('❌ Error actualizando operaciones:', tx.error);
          db.close();
          reject(tx.error);
        };
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}

// 3. Función para limpiar operaciones fallidas antiguas
async function limpiarOperacionesFallidas(diasAntiguedad = 7) {
  console.log(`🧹 Limpiando operaciones fallidas de más de ${diasAntiguedad} días...\n`);
  
  const corte = Date.now() - (diasAntiguedad * 24 * 60 * 60 * 1000);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      store.getAll().onsuccess = (e) => {
        const operaciones = e.target.result;
        let eliminadas = 0;
        
        operaciones.forEach(op => {
          if (op.status === 'failed' && op.timestamp < corte) {
            store.delete(op.id);
            eliminadas++;
            console.log(`  🗑️  Eliminada: ${op.id} (${op.method} ${op.url})`);
          }
        });
        
        tx.oncomplete = () => {
          console.log(`\n✅ ${eliminadas} operaciones eliminadas`);
          db.close();
          resolve(eliminadas);
        };
        
        tx.onerror = () => reject(tx.error);
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Exponer funciones globalmente
window.diagnosticarOperacionesAtascadas = diagnosticarOperacionesAtascadas;
window.forzarSincronizacionInmediata = forzarSincronizacionInmediata;
window.limpiarOperacionesFallidas = limpiarOperacionesFallidas;

console.log('🔧 Funciones de diagnóstico disponibles:');
console.log('  - diagnosticarOperacionesAtascadas()');
console.log('  - forzarSincronizacionInmediata()');
console.log('  - limpiarOperacionesFallidas(dias)');
console.log('\n💡 Ejecuta: diagnosticarOperacionesAtascadas()');
