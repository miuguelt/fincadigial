/**
 * Cargador dinámico bajo demanda de jsPDF y jspdf-autotable.
 *
 * Evita incluir los ~600 kB combinados de jsPDF + html2canvas en los paquetes
 * iniciales de las páginas de dashboard y vistas analíticas. La descarga
 * se pospone hasta que el usuario hace clic en el botón de exportación.
 */
export async function getPdfEngine() {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule.default || autoTableModule) as any;
  return { jsPDF, autoTable };
}
