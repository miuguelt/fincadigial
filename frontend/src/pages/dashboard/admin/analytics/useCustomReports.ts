import { useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/api/apiFetch";
import { unwrapApi } from "@/shared/api/client";
import { devLogger } from "@/shared/utils/devLogger";

export interface ReportConfig {
	period: string;
	metrics: string[];
	groupBy: string[];
	filters: Record<string, any>;
}

export const metricsOptions = [
	{
		value: "animals",
		label: "Animales",
		description: "Estadísticas de inventario de animales",
	},
	{
		value: "health",
		label: "Salud",
		description: "Tratamientos, vacunaciones y enfermedades",
	},
	{
		value: "production",
		label: "Producción",
		description: "Peso, GMD y productividad",
	},
	{
		value: "fields",
		label: "Campos",
		description: "Ocupación y gestión de potreros",
	},
	{
		value: "finance",
		label: "Finanzas",
		description: "Ingresos, Egresos y Balances",
	},
	{
		value: "milk",
		label: "Lechería",
		description: "Control de ordeños y producción de leche",
	},
	{
		value: "agriculture",
		label: "Agricultura",
		description: "Cosechas, cultivos e insumos",
	},
];

export const groupByOptions = [
	{ value: "breed", label: "Raza" },
	{ value: "field", label: "Campo/Potrero" },
	{ value: "species", label: "Especie" },
	{ value: "month", label: "Mes" },
	{ value: "health_status", label: "Estado de Salud" },
];

export const periodOptions = [
	{ value: "1m", label: "1 mes" },
	{ value: "3m", label: "3 meses" },
	{ value: "6m", label: "6 meses" },
	{ value: "1y", label: "1 año" },
	{ value: "2y", label: "2 años" },
	{ value: "all", label: "Todo el historial" },
];

export const useCustomReports = () => {
	const successRef = useRef<HTMLDivElement>(null);
	const [config, setConfig] = useState<ReportConfig>({
		period: "1y",
		metrics: ["animals"],
		groupBy: [],
		filters: {},
	});

	const generateReport = useMutation({
		mutationFn: async (cfg: ReportConfig) => {
			const res = await apiFetch({
				url: "/analytics/reports/custom",
				method: "POST",
				data: cfg,
			} as any);
			return unwrapApi(res);
		},
		onError: (error: any) => {
			devLogger.error("Report generation failed:", error);
		},
	});

	useEffect(() => {
		if (generateReport.isSuccess && successRef.current) {
			const isMobile = window.innerWidth < 768;
			if (isMobile) {
				successRef.current.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}
		}
	}, [generateReport.isSuccess]);

	const handleGenerate = () => {
		generateReport.mutate(config);
	};

	const handleDownloadJSON = () => {
		if (!generateReport.data) return;
		const dataStr = JSON.stringify(generateReport.data, null, 2);
		const dataUri =
			"data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
		const exportFileDefaultName = `reporte-${new Date().toISOString()}.json`;
		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", dataUri);
		linkElement.setAttribute("download", exportFileDefaultName);
		linkElement.click();
	};

	const handleDownloadCSV = () => {
		if (!generateReport.data) return;

		let csv = "Métrica,Valor\n";
		const flattenObject = (obj: any, prefix = ""): void => {
			for (const [key, value] of Object.entries(obj)) {
				if (
					typeof value === "object" &&
					value !== null &&
					!Array.isArray(value)
				) {
					flattenObject(value, `${prefix}${key}.`);
				} else {
					csv += `${prefix}${key},${value}\n`;
				}
			}
		};
		flattenObject(generateReport.data);

		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `reporte-${new Date().toISOString()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleDownloadPDF = () => {
		if (!generateReport.data) return;
		const report = (generateReport.data as any).report || {};
		const summary = report.summary || {};
		const details = report.details || {};
		const metadata = (generateReport.data as any).metadata || {};

		const doc = new jsPDF();
		const runAutoTable = (docObj: any, options: any) => {
			try {
				if (typeof autoTable === "function") autoTable(docObj, options);
				else if (typeof (autoTable as any).default === "function")
					(autoTable as any).default(docObj, options);
			} catch (e) {
				devLogger.error(e);
			}
		};

		doc.setFillColor(15, 23, 42);
		doc.rect(0, 0, 210, 35, "F");

		doc.setFontSize(18);
		doc.setTextColor(255, 255, 255);
		doc.text("REPORTE ANALÍTICO PERSONALIZADO", 20, 18);

		doc.setFontSize(9);
		doc.setTextColor(200, 200, 255);
		doc.text("Sistema de Gestión Ganadera VillaLuz", 20, 27);

		doc.setFontSize(10);
		doc.setTextColor(80, 80, 80);
		doc.text(`Generado por: ${metadata.user || "Usuario"}`, 20, 45);
		doc.text(
			`Fecha del Reporte: ${new Date(metadata.generated_at).toLocaleString("es-CO")}`,
			20,
			52,
		);
		doc.text(
			`Período de Análisis: ${periodOptions.find((p) => p.value === config.period)?.label || "N/A"}`,
			20,
			59,
		);

		let currentY = 70;

		if (Object.keys(summary).length > 0) {
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("1. Resumen Ejecutivo (KPIs)", 20, currentY);
			currentY += 8;

			const summaryRows = Object.entries(summary).map(
				([key, val]: [string, any]) => [
					key.replace(/_/g, " ").toUpperCase(),
					typeof val === "number" && val % 1 !== 0
						? val.toFixed(1)
						: String(val),
				],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Indicador Clave", "Valor Medido"]],
				body: summaryRows,
				headStyles: { fillColor: [30, 41, 59] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.inventario_animales) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("2. Distribución y Demografía del Ganado", 20, currentY);
			currentY += 8;

			const estadoRows = Object.entries(
				details.inventario_animales.estados,
			).map(([state, qty]: [string, any]) => [
				state.toUpperCase(),
				String(qty),
			]);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Estado del Animal", "Cantidad"]],
				body: estadoRows,
				headStyles: { fillColor: [37, 99, 235] },
				theme: "grid",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 10;

			const sexoRows = Object.entries(details.inventario_animales.sexo).map(
				([sex, qty]: [string, any]) => [
					sex.replace("_vivos", "").replace("_vivas", "").toUpperCase() + "S",
					String(qty),
				],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Distribución por Sexo", "Cabezas Activas"]],
				body: sexoRows,
				headStyles: { fillColor: [14, 165, 233] },
				theme: "grid",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (
			details.distribucion_razas &&
			Object.keys(details.distribucion_razas).length > 0
		) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("3. Distribución por Razas Predominantes", 20, currentY);
			currentY += 8;

			const breedRows = Object.entries(details.distribucion_razas).map(
				([breed, qty]: [string, any]) => [breed.toUpperCase(), String(qty)],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Raza del Ganado", "Cantidad de Cabezas"]],
				body: breedRows,
				headStyles: { fillColor: [139, 92, 246] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.historial_salud) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("4. Historial Sanitario e Intervenciones", 20, currentY);
			currentY += 8;

			const saludRows = details.historial_salud.ultimos_tratamientos.map(
				(t: any) => [t.fecha, t.descripcion, t.dosis, t.observaciones],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [
					["Fecha", "Descripción del Tratamiento", "Dosis", "Observaciones"],
				],
				body:
					saludRows.length > 0
						? saludRows
						: [["N/A", "Sin tratamientos registrados", "N/A", "N/A"]],
				headStyles: { fillColor: [5, 150, 105] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.produccion_y_biometria) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("5. Controles Biométricos y de Peso Corporal", 20, currentY);
			currentY += 8;

			const pesoRows = details.produccion_y_biometria.ultimos_controles.map(
				(c: any) => [
					c.fecha,
					`${c.peso_kg} kg`,
					`${c.altura_cm} cm`,
					c.estado_salud,
				],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Fecha Control", "Peso Corporal", "Altura", "Estado de Salud"]],
				body:
					pesoRows.length > 0
						? pesoRows
						: [["N/A", "Sin controles registrados", "N/A", "N/A"]],
				headStyles: { fillColor: [234, 88, 12] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.gestion_potreros) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("6. Estado e Infraestructura de Potreros", 20, currentY);
			currentY += 8;

			const potreroRows = details.gestion_potreros.potreros.map((p: any) => [
				p.nombre,
				p.ubicacion || "N/A",
				`${p.area_ha} Ha`,
				`${p.capacidad_cabezas} Cabezas`,
				p.estado,
			]);

			runAutoTable(doc, {
				startY: currentY,
				head: [
					["Potrero", "Ubicación", "Área", "Capacidad Máx.", "Estado Actual"],
				],
				body:
					potreroRows.length > 0
						? potreroRows
						: [["N/A", "N/A", "N/A", "N/A", "N/A"]],
				headStyles: { fillColor: [16, 185, 129] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.finanzas_y_economia) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("7. Balance Financiero y Transacciones", 20, currentY);
			currentY += 8;

			const finRows = details.finanzas_y_economia.ultimos_movimientos.map(
				(f: any) => [
					f.fecha,
					f.tipo,
					f.categoria,
					`$ ${f.monto}`,
					f.descripcion,
				],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Fecha", "Tipo", "Categoría", "Monto", "Descripción"]],
				body:
					finRows.length > 0 ? finRows : [["N/A", "N/A", "N/A", "N/A", "N/A"]],
				headStyles: { fillColor: [79, 70, 229] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.produccion_lechera) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("8. Producción Lechera y Ordeños", 20, currentY);
			currentY += 8;

			const milkRows = details.produccion_lechera.ultimos_ordenos.map(
				(m: any) => [m.fecha, m.jornada, `${m.litros} L`, m.observaciones],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [["Fecha", "Jornada", "Litros Producidos", "Observaciones"]],
				body: milkRows.length > 0 ? milkRows : [["N/A", "N/A", "N/A", "N/A"]],
				headStyles: { fillColor: [56, 189, 248] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		if (details.actividades_agricolas) {
			if (currentY > 230) {
				doc.addPage();
				currentY = 20;
			}
			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text("9. Estado Agrícola y Cultivos", 20, currentY);
			currentY += 8;

			const cropRows = details.actividades_agricolas.ultimas_actividades.map(
				(c: any) => [
					c.fecha,
					c.tipo,
					c.cultivo,
					`$ ${c.costo}`,
					c.observaciones,
				],
			);

			runAutoTable(doc, {
				startY: currentY,
				head: [
					[
						"Fecha",
						"Actividad",
						"Cultivo Relacionado",
						"Costo",
						"Observaciones",
					],
				],
				body:
					cropRows.length > 0
						? cropRows
						: [["N/A", "N/A", "N/A", "N/A", "N/A"]],
				headStyles: { fillColor: [101, 163, 13] },
				theme: "striped",
				margin: { left: 20, right: 20 },
			});

			currentY = (doc as any).lastAutoTable.finalY + 15;
		}

		doc.setFontSize(9);
		doc.setTextColor(150, 150, 150);
		doc.text(
			`Generado el ${new Date().toLocaleString("es-CO")} por el sistema de gestión VillaLuz.`,
			20,
			currentY + 10,
		);
		doc.text(
			"Los datos corresponden al período seleccionado y se extraen directamente de la base de datos de la finca.",
			20,
			currentY + 15,
		);

		doc.save(
			`VillaLuz_ReporteAnalitico_${new Date().toISOString().split("T")[0]}.pdf`,
		);
	};

	return {
		successRef,
		config,
		setConfig,
		generateReport,
		handleGenerate,
		handleDownloadJSON,
		handleDownloadCSV,
		handleDownloadPDF,
	};
};
