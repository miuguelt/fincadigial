import { getPdfEngine } from '@/shared/utils/pdfExport';

export async function exportICACompliancePdf(data: any, filteredAnimals: any[]) {
  const { jsPDF, autoTable } = await getPdfEngine();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as any;

  const runAutoTable = (docObj: any, options: any) => {
    try {
      if (typeof autoTable === 'function') autoTable(docObj, options);
      else if (typeof (autoTable as any).default === 'function')
        (autoTable as any).default(docObj, options);
    } catch (e) {
      console.error('Error in autoTable:', e);
    }
  };

  // --- 1. BANNER INSTITUCIONAL ---
  doc.setFillColor(22, 78, 38); // Verde bosque #164e26
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(46, 125, 50); // Verde esmeralda acento
  doc.rect(0, 32, 210, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('HACIENDA VILLA LUZ', 14, 13);

  doc.setFontSize(8.5);
  doc.setTextColor(200, 230, 201);
  doc.text('SISTEMA DE GESTIÓN GANADERA • CONTROL NORMATIVO ICA', 14, 20);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AUDITORÍA SANITARIA OFICIAL', 196, 13, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 230, 201);
  doc.text(`Emisión: ${dateStr}`, 196, 20, { align: 'right' });
  doc.text('Resolución ICA Vigente • Finca Libre de Brucelosis y Aftosa', 196, 26, { align: 'right' });

  // --- 2. TARJETAS DE INDICADORES KPI ---
  const startY = 40;
  const total = data.total || 0;
  const greenCount = data.counts?.green || 0;
  const yellowCount = data.counts?.yellow || 0;
  const redCount = data.counts?.red || 0;
  const pct = total > 0 ? ((greenCount / total) * 100).toFixed(1) : '0';

  const cardW = 42;
  const cardH = 18;
  const cardGap = 4;
  const leftM = 14;

  const drawCard = (x: number, title: string, value: string, sub: string, tone: 'green' | 'amber' | 'red' | 'neutral') => {
    doc.setFillColor(248, 251, 248);
    doc.setDrawColor(220, 230, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), x + 3.5, startY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (tone === 'green') doc.setTextColor(22, 101, 52);
    else if (tone === 'amber') doc.setTextColor(217, 119, 6);
    else if (tone === 'red') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(15, 23, 42);
    doc.text(value, x + 3.5, startY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(sub, x + 3.5, startY + 15.5);
  };

  drawCard(leftM, 'Total Ganado', `${total} cabezas`, 'Población censada', 'neutral');
  drawCard(leftM + (cardW + cardGap), 'Cumplimiento', `${pct}%`, `${greenCount} al día`, 'green');
  drawCard(leftM + (cardW + cardGap) * 2, 'Próximos a Vencer', `${yellowCount} cabezas`, 'Atención 15-30 días', 'amber');
  drawCard(leftM + (cardW + cardGap) * 3, 'Vencidos / Alerta', `${redCount} cabezas`, 'Requiere dosis urgente', 'red');

  // --- 3. TABLA DE DETALLE SANITARIO POR ANIMAL ---
  const tableData = filteredAnimals.map((animal: any) => [
    animal.record || `ID-${animal.id}`,
    animal.name && animal.name !== '---' ? animal.name : 'Sin nombre',
    animal.overall === 'green' ? 'AL DÍA' : animal.overall === 'yellow' ? 'EN OBSERVACIÓN' : 'VENCIDO',
    animal.checks?.aftosa?.status === 'ok' ? 'Al día' : `${animal.checks?.aftosa?.days || 0}d`,
    animal.checks?.brucelosis?.status === 'ok' ? 'Al día' : `${animal.checks?.brucelosis?.days || 0}d`,
    animal.checks?.clostridial?.status === 'ok' ? 'Al día' : `${animal.checks?.clostridial?.days || 0}d`,
    animal.checks?.desparasitacion?.status === 'ok' ? 'Al día' : `${animal.checks?.desparasitacion?.days || 0}d`,
  ]);

  runAutoTable(doc, {
    startY: startY + cardH + 7,
    head: [['ID / Arete', 'Nombre', 'Estado General', 'Fiebre Aftosa', 'Brucelosis', 'Clostridial', 'Desparasit.']],
    body: tableData.length > 0 ? tableData : [['---', 'Sin animales', '---', '---', '---', '---', '---']],
    theme: 'grid',
    headStyles: {
      fillColor: [22, 78, 38],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 34, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 23, halign: 'center' },
      4: { cellWidth: 23, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
    },
    margin: { left: 14, right: 14 },
    didParseCell: (dataCell: any) => {
      if (dataCell.section === 'body' && dataCell.column.index === 2) {
        const val = String(dataCell.cell.raw || '');
        if (val.includes('AL DÍA')) dataCell.cell.styles.textColor = [22, 101, 52];
        else if (val.includes('OBSERVACIÓN')) dataCell.cell.styles.textColor = [217, 119, 6];
        else if (val.includes('VENCIDO')) dataCell.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  // --- 4. SECCIÓN DE FIRMAS AL FINAL ---
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY > 240) {
    doc.addPage();
    finalY = 35;
  }

  doc.setDrawColor(200, 220, 200);
  doc.setFillColor(248, 251, 248);
  doc.rect(14, finalY, 182, 12, 'DF');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CERTIFICACIÓN DE CUMPLIMIENTO SANITARIO OFICIAL ICA:', 18, finalY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Este documento certifica el estado vacunal y sanitario del lote en concordancia con el ciclo oficial de vacunación.', 18, finalY + 8.5);

  finalY += 25;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);

  doc.line(25, finalY, 90, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Firma Médico Veterinario / ICA', 57.5, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Tarjeta Profesional / Registro Oficial', 57.5, finalY + 8, { align: 'center' });

  doc.line(120, finalY, 185, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Firma Propietario / Administrador', 152.5, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Cédula / Representante del Predio', 152.5, finalY + 8, { align: 'center' });

  // --- 5. PIE DE PÁGINA Y PAGINACIÓN FORMAL ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 284, 196, 284);
    doc.text('Hacienda Villa Luz • Sistema de Información y Trazabilidad Ganadera', 14, 289);
    doc.text(`Página ${i} de ${totalPages}`, 196, 289, { align: 'right' });
  }

  doc.save(`VillaLuz_Cumplimiento_ICA_${new Date().toISOString().split('T')[0]}.pdf`);
}

