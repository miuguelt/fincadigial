import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportICACompliancePdf(data: any, filteredAnimals: any[]) {
  const doc = new jsPDF() as any;
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CUMPLIMIENTO SANITARIO', 20, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 20, 32);
  doc.text('Finca VillaLuz - Sistema de Gestión Premium', 140, 32);
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.text('Resumen del Ganado', 20, 55);

  const stats = [
    ['Total Animales', String(data.total)],
    ['Al Día (Cumplimiento)', `${data.counts.green} (${(data.counts.green / data.total * 100).toFixed(1)}%)`],
    ['Próximos a Vencer', String(data.counts.yellow)],
    ['Vencidos / Críticos', String(data.counts.red)],
  ];
  autoTable(doc, {
    startY: 60,
    head: [['Métrica', 'Valor']],
    body: stats,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.text('Detalle de Vacunación por Animal', 20, doc.lastAutoTable.finalY + 15);
  const tableData = filteredAnimals.map((animal: any) => [
    animal.record,
    animal.name || '---',
    animal.overall === 'green' ? 'AL DÍA' : animal.overall === 'yellow' ? 'REVISAR' : 'VENCIDO',
    animal.checks.aftosa.status === 'ok' ? 'OK' : `${animal.checks.aftosa.days}d`,
    animal.checks.brucelosis.status === 'ok' ? 'OK' : `${animal.checks.brucelosis.days}d`,
    animal.checks.clostridial.status === 'ok' ? 'OK' : `${animal.checks.clostridial.days}d`,
    animal.checks.desparasitacion.status === 'ok' ? 'OK' : `${animal.checks.desparasitacion.days}d`,
  ]);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['ID', 'Nombre', 'Estado', 'Aftosa', 'Brucel.', 'Clostrid.', 'Despar.']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 2: { fontStyle: 'bold' } },
    didParseCell: (dataCell: any) => {
      if (dataCell.section === 'body' && dataCell.column.index === 2) {
        const value = dataCell.cell.raw;
        if (value === 'AL DÍA') dataCell.cell.styles.textColor = [16, 185, 129];
        if (value === 'REVISAR') dataCell.cell.styles.textColor = [245, 158, 11];
        if (value === 'VENCIDO') dataCell.cell.styles.textColor = [239, 68, 68];
      }
    },
  });

  doc.save(`reporte-cumplimiento-villaluz-${new Date().toISOString().split('T')[0]}.pdf`);
}
