import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { devLogger } from "@/shared/utils/devLogger";
import type { UnifiedRecord } from "../types";

interface Stats {
	milkTotal: number;
	activeDiseases: number;
	transfersCount: number;
	treatmentsCount: number;
}

export const exportGanaderiaToCSV = (
	filteredRecords: UnifiedRecord[],
	showToast: (msg: string, type: "success" | "error" | "warning") => void,
	fincaName?: string,
) => {
	if (filteredRecords.length === 0) {
		showToast("No hay registros para exportar", "warning");
		return;
	}

	const headers = [
		"Fecha",
		"Registro Animal",
		"Tipo Actividad",
		"Detalle/Línea",
		"Observaciones",
	];
	const rows = filteredRecords.map((r) => {
		const typeLabel =
			r.type === "milking"
				? "Ordeño"
				: r.type === "transfer"
					? "Traslado"
					: r.type === "disease"
						? "Enfermedad"
						: "Tratamiento";
		return [
			r.date,
			`"${r.animalLabel.replace(/"/g, '""')}"`,
			`"${typeLabel}"`,
			`"${r.details.replace(/"/g, '""')}"`,
			`"${(r.notes || "").replace(/"/g, '""')}"`,
		];
	});

	const csvContent =
		"\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	const fincaSlug = (fincaName || "VillaLuz").replace(/\s+/g, "_");
	link.setAttribute(
		"download",
		`${fincaSlug}_Actividades_Ganaderas_${new Date().toISOString().split("T")[0]}.csv`,
	);
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	showToast("Reporte CSV descargado con éxito", "success");
};

export const exportGanaderiaToPDF = (
	filteredRecords: UnifiedRecord[],
	stats: Stats,
	showToast: (msg: string, type: "success" | "error" | "warning") => void,
	fincaName?: string,
) => {
	if (filteredRecords.length === 0) {
		showToast("No hay registros para exportar", "warning");
		return;
	}

	const doc = new jsPDF({
		orientation: "portrait",
		unit: "mm",
		format: "a4",
	});

	// Header Band
	doc.setFillColor(16, 185, 129); // Emerald 500
	doc.rect(0, 0, 210, 32, "F");

	// Title
	doc.setFont("helvetica", "bold");
	doc.setFontSize(18);
	doc.setTextColor(255, 255, 255);
	doc.text(fincaName?.toUpperCase() || "HACIENDA DIGITAL", 15, 14);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(209, 250, 229); // Emerald 100
	doc.text("REPORTE OPERATIVO CONSOLIDADO • GANADERÍA", 15, 20);

	const todayStr = new Date().toLocaleDateString("es-CO", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	doc.setFontSize(8);
	doc.setTextColor(167, 243, 208); // Emerald 200
	doc.text(`Generado: ${todayStr}`, 15, 26);

	// Summary Box
	doc.setFillColor(255, 255, 255, 0.15);
	doc.roundedRect(155, 6, 40, 20, 2, 2, "F");
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(8);
	doc.setFont("helvetica", "bold");
	doc.text("REGISTROS FILTRADOS", 158, 12);
	doc.setFontSize(12);
	doc.text(`${filteredRecords.length} ACTIVIDADES`, 158, 20);

	// Metrics summary on PDF
	doc.setTextColor(31, 41, 55); // Gray 800
	doc.setFontSize(10);
	doc.setFont("helvetica", "bold");
	doc.text("RESUMEN DE OPERACIÓN", 15, 42);

	const cardWidth = 42;
	const cardHeight = 15;
	const startY = 46;
	const cardGap = 6;

	const drawCard = (x: number, title: string, value: string) => {
		doc.setFillColor(243, 244, 246); // Gray 100
		doc.setDrawColor(229, 231, 235); // Gray 200
		doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, "FD");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(7);
		doc.setTextColor(107, 114, 128); // Gray 500
		doc.text(title.toUpperCase(), x + 4, startY + 4.5);

		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.setTextColor(16, 185, 129); // Emerald 500
		doc.text(value, x + 4, startY + 10.5);
	};

	drawCard(15, "Producción Leche", `${stats.milkTotal} Litros`);
	drawCard(
		15 + cardWidth + cardGap,
		"Enfermos Activos",
		`${stats.activeDiseases} Casos`,
	);
	drawCard(
		15 + (cardWidth + cardGap) * 2,
		"Traslados de Ganado",
		`${stats.transfersCount} Movs`,
	);
	drawCard(
		15 + (cardWidth + cardGap) * 3,
		"Tratamientos",
		`${stats.treatmentsCount} Aplicados`,
	);

	// Table mapping
	const tableRows = filteredRecords.map((r) => {
		const typeLabel =
			r.type === "milking"
				? "Ordeño"
				: r.type === "transfer"
					? "Traslado"
					: r.type === "disease"
						? "Enfermedad"
						: "Tratamiento";
		return [r.date, r.animalLabel, typeLabel, r.details, r.notes || "---"];
	});

	try {
		const runAutoTable = (docObj: any, options: any) => {
			if (typeof autoTable === "function") autoTable(docObj, options);
			else if (typeof (autoTable as any).default === "function")
				(autoTable as any).default(docObj, options);
		};

		runAutoTable(doc, {
			startY: 68,
			head: [["Fecha", "Vaca/Animal", "Actividad", "Detalle", "Observaciones"]],
			body: tableRows,
			theme: "grid",
			headStyles: {
				fillColor: [16, 185, 129], // Emerald 500
				textColor: [255, 255, 255],
				fontSize: 8.5,
				fontStyle: "bold",
			},
			columnStyles: {
				0: { cellWidth: 22 },
				1: { cellWidth: 42, fontStyle: "bold" },
				2: { cellWidth: 25 },
				3: { cellWidth: 50 },
			},
			styles: {
				fontSize: 8,
				cellPadding: 2,
			},
			margin: { left: 15, right: 15 },
			didDrawPage: (data: any) => {
				const pageCount = doc.getNumberOfPages();
				doc.setFont("helvetica", "normal");
				doc.setFontSize(7.5);
				doc.setTextColor(156, 163, 175); // Gray 400
				doc.line(15, 282, 195, 282);
				doc.text(
					`${fincaName || "Hacienda Digital"} • Sistema Campesino Digital`,
					15,
					287,
				);
				doc.text(
					`Página ${data.pageNumber} de ${pageCount}`,
					195 - doc.getTextWidth(`Página ${data.pageNumber} de ${pageCount}`),
					287,
				);
			},
		});

		// Signature section
		let finalY = (doc as any).lastAutoTable.finalY + 15;
		if (finalY > 240) {
			doc.addPage();
			finalY = 25;
		}

		doc.setDrawColor(209, 213, 219);
		doc.line(20, finalY + 12, 80, finalY + 12);
		doc.line(130, finalY + 12, 190, finalY + 12);

		doc.setFont("helvetica", "bold");
		doc.setFontSize(8);
		doc.setTextColor(55, 65, 81);
		doc.text("Firma del Capataz / Campesino", 20, finalY + 16);
		doc.text("Firma del Veterinario / Administrador", 130, finalY + 16);

		const fincaSlug = (fincaName || "FincaDigital").replace(/\s+/g, "_");
		const filename = `${fincaSlug}_ReporteOperativo_${new Date().toISOString().split("T")[0]}.pdf`;
		doc.save(filename);
		showToast("Reporte PDF descargado con éxito", "success");
	} catch (err) {
		devLogger.error(err);
		showToast("Error al compilar el PDF", "error");
	}
};
