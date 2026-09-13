import type { HealthBreakdown, WeighingReport } from "./controlReport";
import type { MilkReport } from "./milkReport";
import type { PeriodRange } from "./reportPeriod";

export interface ReportSnapshot {
	range: PeriodRange;
	milk: MilkReport;
	health: HealthBreakdown;
	weighing: WeighingReport;
	/** Animales sin revisión en más de STALE_CHECK_DAYS días. */
	staleCount: number;
}

/** Umbral de "lleva mucho sin revisión", en días. */
export const STALE_CHECK_DAYS = 30;

/** Formato colombiano: separador de miles con punto y decimal con coma. */
export function formatNumber(value: number, maximumFractionDigits = 1): string {
	return value.toLocaleString("es-CO", { maximumFractionDigits });
}

/** Fecha corta dd/mm/aaaa a partir de un YYYY-MM-DD, sin desfase de zona. */
export function formatDayShort(dateOnly: string): string {
	const [year, month, day] = dateOnly.split("-");
	if (!year || !month || !day) return dateOnly;
	return `${day}/${month}/${year}`;
}

function bucketCount(health: HealthBreakdown, key: string): number {
	return health.buckets.find((bucket) => bucket.key === key)?.count ?? 0;
}

/** Resumen en texto plano, pensado para copiar y enviar por mensaje. */
export function buildReportText({
	range,
	milk,
	health,
	weighing,
	staleCount,
}: ReportSnapshot): string {
	const lines = [
		`Villa Luz · ${range.label} (${formatDayShort(range.start)} a ${formatDayShort(range.end)})`,
	];

	if (milk.unavailable) {
		lines.push("Leche: sin datos disponibles");
	} else {
		lines.push(
			`Leche: ${formatNumber(milk.totalLiters)} L en total, ${formatNumber(milk.dailyAverage)} L por día (${milk.daysWithRecords} días con ordeño)`,
		);
		if (milk.bestDay) {
			lines.push(
				`Mejor día: ${formatDayShort(milk.bestDay.date)} con ${formatNumber(milk.bestDay.liters)} L`,
			);
		}
	}

	lines.push(
		`Salud: ${bucketCount(health, "sano")} sanos, ${bucketCount(health, "observacion")} en observación, ${bucketCount(health, "grave")} graves (de ${health.total} animales revisados)`,
	);

	if (staleCount > 0) {
		lines.push(
			`${staleCount} animales llevan más de ${STALE_CHECK_DAYS} días sin revisión`,
		);
	}

	lines.push(
		weighing.averageWeight === null
			? "Pesajes: ninguno en el periodo"
			: `Pesajes: ${weighing.count} en ${weighing.animals} animales, promedio ${formatNumber(weighing.averageWeight)} kg`,
	);

	return lines.join("\n");
}

/**
 * CSV del ordeño diario. Se separa con punto y coma porque el decimal en
 * Colombia es la coma: con separador coma, Excel parte cada número en dos.
 */
export function buildReportCsv({ milk }: ReportSnapshot): string {
	const rows = milk.points.map(
		(point) =>
			`${point.date};${formatNumber(point.liters)};${formatNumber(point.animals, 0)}`,
	);
	return ["fecha;litros;animales_ordeñados", ...rows].join("\n");
}

/**
 * Genera y descarga un reporte PDF profesional y de alta calidad del período de control.
 */
export async function exportPeriodReportPdf(
	snapshot: ReportSnapshot,
	fincaName = "Hacienda Villa Luz",
): Promise<void> {
	const { jsPDF } = await import("jspdf");
	const autoTableModule = await import("jspdf-autotable");
	const autoTable = (autoTableModule as any).default || autoTableModule;

	const doc = new jsPDF({
		orientation: "portrait",
		unit: "mm",
		format: "a4",
	});

	// Franja verde bosque institucional #164e26
	doc.setFillColor(22, 78, 38);
	doc.rect(0, 0, 210, 32, "F");
	doc.setFillColor(46, 125, 50);
	doc.rect(0, 32, 210, 2.5, "F");

	doc.setTextColor(255, 255, 255);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(18);
	doc.text(fincaName.toUpperCase(), 14, 13);

	doc.setFontSize(8.5);
	doc.setTextColor(200, 230, 201);
	doc.text("CONTROL DIARIO Y OPERATIVO • RESUMEN DE PERÍODO", 14, 20);

	const nowStr = new Date().toLocaleDateString("es-CO", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	doc.setFontSize(10.5);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(255, 255, 255);
	doc.text("INFORME DE CONTROL", 196, 13, { align: "right" });

	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(200, 230, 201);
	doc.text(`Emisión: ${nowStr}`, 196, 20, { align: "right" });
	doc.text(`Período: ${snapshot.range.label}`, 196, 26, { align: "right" });

	// Metadatos box
	const metaY = 39;
	doc.setFillColor(248, 251, 248);
	doc.setDrawColor(200, 220, 200);
	doc.setLineWidth(0.3);
	doc.rect(14, metaY, 182, 14, "DF");

	doc.setFontSize(8);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(71, 85, 105);
	doc.text("RANGO DEL PERÍODO EVALUADO:", 18, metaY + 5);

	doc.setFont("helvetica", "normal");
	doc.setTextColor(30, 41, 59);
	doc.text(
		`Del ${formatDayShort(snapshot.range.start)} al ${formatDayShort(snapshot.range.end)} · Registros operativos analizados`,
		18,
		metaY + 10,
	);

	// Tarjetas KPI
	const kpiY = metaY + 19;
	const cardW = 42;
	const cardH = 17;
	const cardGap = 4;
	const leftM = 14;

	const drawKpi = (
		x: number,
		title: string,
		value: string,
		sub: string,
		toneColor: [number, number, number] = [15, 23, 42],
	) => {
		doc.setFillColor(248, 251, 248);
		doc.setDrawColor(220, 230, 220);
		doc.setLineWidth(0.3);
		doc.roundedRect(x, kpiY, cardW, cardH, 2, 2, "FD");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(7.5);
		doc.setTextColor(100, 116, 139);
		doc.text(title.toUpperCase(), x + 3.5, kpiY + 4.5);

		doc.setFont("helvetica", "bold");
		doc.setFontSize(10.5);
		doc.setTextColor(...toneColor);
		doc.text(value, x + 3.5, kpiY + 10.5);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(6.8);
		doc.setTextColor(100, 116, 139);
		doc.text(sub, x + 3.5, kpiY + 14.5);
	};

	const milkTotalStr = snapshot.milk.unavailable
		? "N/D"
		: `${formatNumber(snapshot.milk.totalLiters)} L`;
	const milkAvgStr = snapshot.milk.unavailable
		? "N/D"
		: `${formatNumber(snapshot.milk.dailyAverage)} L/día`;
	drawKpi(
		leftM,
		"Producción Leche",
		milkTotalStr,
		"Total del período",
		[2, 132, 199],
	);
	drawKpi(
		leftM + (cardW + cardGap),
		"Promedio Diario",
		milkAvgStr,
		`${snapshot.milk.daysWithRecords} días con ordeño`,
		[22, 78, 38],
	);
	drawKpi(
		leftM + (cardW + cardGap) * 2,
		"Revisados / Sanos",
		`${bucketCount(snapshot.health, "sano")} / ${snapshot.health.total}`,
		"Último control activo",
		[22, 101, 52],
	);
	const weighStr =
		snapshot.weighing.averageWeight === null
			? "Sin pesajes"
			: `${formatNumber(snapshot.weighing.averageWeight)} kg`;
	drawKpi(
		leftM + (cardW + cardGap) * 3,
		"Peso Promedio",
		weighStr,
		`${snapshot.weighing.count} pesajes registrados`,
		[217, 119, 6],
	);

	// Tabla de puntos de leche
	const tableY = kpiY + cardH + 7;
	doc.setFontSize(10.5);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(22, 78, 38);
	doc.text("Detalle Diario de Ordeño Registrado", 14, tableY);

	const milkRows = snapshot.milk.points.map((p) => [
		formatDayShort(p.date),
		`${formatNumber(p.liters)} L`,
		String(p.animals),
		p.date === snapshot.milk.bestDay?.date ? "Mejor Producción" : "-",
	]);

	autoTable(doc, {
		startY: tableY + 3,
		head: [["Fecha", "Litros Registrados", "Animales Ordeñados", "Rendimiento"]],
		body:
			milkRows.length > 0
				? milkRows
				: [["-", "Sin registros de ordeño en el período", "-", "-"]],
		headStyles: {
			fillColor: [22, 78, 38],
			textColor: [255, 255, 255],
			fontSize: 8.5,
			halign: "center",
		},
		columnStyles: {
			0: { cellWidth: 35, halign: "center" },
			1: { cellWidth: 45, halign: "right", fontStyle: "bold" },
			2: { cellWidth: 45, halign: "center" },
			3: { cellWidth: 57, halign: "center" },
		},
		styles: { fontSize: 8, cellPadding: 2.2 },
		theme: "striped",
		margin: { left: 14, right: 14 },
	});

	// Estado de salud tabla resumen
	const nextY = (doc as any).lastAutoTable.finalY + 8;
	doc.setFontSize(10.5);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(22, 78, 38);
	doc.text("Distribución de Salud y Vigilancia Veterinaria", 14, nextY);

	const healthRows = snapshot.health.buckets.map((b) => [
		b.label,
		String(b.count),
		`${formatNumber(b.percentage)}%`,
		b.key === "grave" && b.count > 0
			? "Atención Prioritaria"
			: b.key === "observacion"
				? "Seguimiento"
				: "Adecuado",
	]);

	autoTable(doc, {
		startY: nextY + 3,
		head: [["Estado Clínico", "N° Animales", "Proporción", "Acción Recomendada"]],
		body: healthRows,
		headStyles: {
			fillColor: [30, 41, 59],
			textColor: [255, 255, 255],
			fontSize: 8.5,
			halign: "center",
		},
		columnStyles: {
			0: { cellWidth: 50 },
			1: { cellWidth: 35, halign: "center", fontStyle: "bold" },
			2: { cellWidth: 35, halign: "right" },
			3: { cellWidth: 62, halign: "center" },
		},
		styles: { fontSize: 8, cellPadding: 2.2 },
		theme: "grid",
		margin: { left: 14, right: 14 },
		didParseCell: (dataCell: any) => {
			if (dataCell.section === "body" && dataCell.column.index === 3) {
				const val = String(dataCell.cell.raw || "");
				if (val.includes("Prioritaria")) dataCell.cell.styles.textColor = [220, 38, 38];
				else if (val.includes("Seguimiento")) dataCell.cell.styles.textColor = [217, 119, 6];
				else if (val.includes("Adecuado")) dataCell.cell.styles.textColor = [22, 101, 52];
			}
		},
	});

	// Paginación y footer formal
	const totalPages = doc.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(140, 140, 140);
		doc.setDrawColor(226, 232, 240);
		doc.setLineWidth(0.3);
		doc.line(14, 284, 196, 284);
		doc.text(
			"Hacienda Villa Luz • Control Periódico de Ordeño y Salud",
			14,
			289,
		);
		doc.text(`Página ${i} de ${totalPages}`, 196, 289, { align: "right" });
	}

	doc.save(
		`VillaLuz_Control_${snapshot.range.start}_al_${snapshot.range.end}.pdf`,
	);
}

