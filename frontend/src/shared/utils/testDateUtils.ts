/**
 * Script de prueba para verificar que las funciones de utilidad de fecha funcionen correctamente
 */

import { getTodayColombia, formatDateColombia, isTodayColombia } from './dateUtils';

// Función de prueba
export const testDateUtils = () => {
  console.log('🧪 Probando funciones de utilidad de fecha...');

  // Probar getTodayColombia
  const todayColombia = getTodayColombia();
  console.log('📅 Fecha actual en Colombia:', todayColombia);

  // Verificar que el formato sea YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(todayColombia)) {
    console.error('❌ Formato de fecha incorrecto. Se esperaba YYYY-MM-DD');
    return false;
  }
  console.log('✅ Formato de fecha correcto');

  // Probar formatDateColombia con una fecha específica
  const testDate = new Date('2023-12-25');
  const formattedDate = formatDateColombia(testDate);
  console.log('📅 Fecha formateada (2023-12-25):', formattedDate);

  if (formattedDate !== '2023-12-25') {
    console.error('❌ Error al formatear fecha. Se esperaba 2023-12-25');
    return false;
  }
  console.log('✅ Función formatDateColombia funciona correctamente');

  // Probar isTodayColombia
  const today = new Date();
  const isToday = isTodayColombia(today);
  console.log('📅 ¿Hoy es hoy?', isToday);

  if (!isToday) {
    console.error('❌ Error en isTodayColombia. Hoy debería ser hoy');
    return false;
  }
  console.log('✅ Función isTodayColombia funciona correctamente');

  // Probar con una fecha que no es hoy
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = isTodayColombia(yesterday);
  console.log('📅 ¿Ayer es hoy?', isYesterday);

  if (isYesterday) {
    console.error('❌ Error en isTodayColombia. Ayer no debería ser hoy');
    return false;
  }
  console.log('✅ Función isTodayColombia detecta correctamente fechas que no son hoy');

  console.log('🎉 Todas las pruebas de funciones de utilidad de fecha pasaron correctamente');
  return true;
};

// Ejecutar pruebas si este archivo se importa directamente
if (typeof window !== 'undefined') {
  // En el navegador, ejecutar pruebas cuando se carga el archivo
  testDateUtils();
}
