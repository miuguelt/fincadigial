import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AnimalReportData {
  id: number;
  record: string;
  name?: string;
  gender?: string;
  sex?: string;
  breeds_id?: number;
  breed_id?: number;
  breed?: { name?: string };
  weight?: number;
  status?: string;
  birth_date?: string;
  age_in_months?: number;
  father_id?: number;
  idFather?: number;
  mother_id?: number;
  idMother?: number;
  notes?: string;
  [key: string]: any;
}

interface Option {
  value: string | number;
  label: string;
}

const getBreedLabel = (
  item: AnimalReportData,
  breedOptions: Option[],
): string => {
  const breedId = item.breeds_id || item.breed_id;
  if (!breedId) return "Sin especificar";
  const option = breedOptions.find((b) => Number(b.value) === Number(breedId));
  if (option) return option.label;
  if (item.breed?.name) return item.breed.name;
  return `ID ${breedId}`;
};

const getAgeLabel = (item: AnimalReportData): string => {
  if (item.age_in_months !== undefined && item.age_in_months !== null) {
    return `${item.age_in_months} meses`;
  }
  if (!item.birth_date) return "---";
  const birth = new Date(item.birth_date);
  if (isNaN(birth.getTime())) return "---";
  const diffMs = Date.now() - birth.getTime();
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
  return `${months} meses`;
};

export const animalReportService = {
  /**
   * Genera y descarga un reporte PDF premium optimizado para el campesino / operador.
   */
  exportToPDF(animals: AnimalReportData[], breedOptions: Option[]) {
    if (!animals || animals.length === 0) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const runAutoTable = (docObj: any, options: any) => {
      try {
        if (typeof autoTable === "function") autoTable(docObj, options);
        else if (typeof (autoTable as any).default === "function")
          (autoTable as any).default(docObj, options);
      } catch (e) {
        console.error("Error executing autoTable:", e);
      }
    };

    // --- 1. BANNER / ENCABEZADO ---
    // Color corporativo: Indigo Oscuro (15, 23, 42)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, "F");

    // Título principal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("HACIENDA VILLA LUZ", 15, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 255);
    doc.text("REPORTE OPERATIVO DE GANADO • FINCA DIGITAL", 15, 20);

    // Fecha de generación y conteo
    const todayStr = new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 240);
    doc.text(`Generado: ${todayStr}`, 15, 26);

    // Logo / Símbolo decorativo (un badge blanco translúcido en la esquina derecha)
    doc.setFillColor(255, 255, 255, 0.1);
    doc.roundedRect(165, 6, 30, 20, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("LOTE ACTIVO", 168, 14);
    doc.setFontSize(11);
    doc.text(`${animals.length} CABEZAS`, 168, 21);

    // --- 2. RESUMEN EJECUTIVO (METRICAS CLAVE) ---
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN OPERATIVO DEL LOTE", 15, 42);

    // Calcular métricas
    const totalCount = animals.length;

    // Cuenta por sexo
    let hembras = 0;
    let machos = 0;
    animals.forEach((a) => {
      const s = String(a.sex || a.gender || "").toLowerCase();
      if (s.startsWith("h") || s.includes("hembra") || s.startsWith("f")) hembras++;
      else if (s.startsWith("m") || s.includes("macho")) machos++;
    });

    // Peso promedio
    const animalsWithWeight = animals.filter(
      (a) => a.weight !== undefined && a.weight !== null && a.weight > 0
    );
    const avgWeight =
      animalsWithWeight.length > 0
        ? Math.round(
            animalsWithWeight.reduce((acc, curr) => acc + (curr.weight || 0), 0) /
              animalsWithWeight.length
          )
        : 0;

    // Raza predominante
    const breedCounts: Record<string, number> = {};
    animals.forEach((a) => {
      const lbl = getBreedLabel(a, breedOptions);
      breedCounts[lbl] = (breedCounts[lbl] || 0) + 1;
    });
    let topBreed = "Ninguna";
    let maxCount = 0;
    Object.entries(breedCounts).forEach(([breed, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topBreed = breed;
      }
    });

    // Dibujar 4 tarjetas de resumen
    const cardWidth = 42;
    const cardHeight = 16;
    const startY = 46;
    const cardGap = 6;

    const drawCard = (x: number, title: string, value: string, sub: string) => {
      doc.setFillColor(248, 250, 252);
      (doc as any).setStrokeColor(226, 232, 240);
      doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), x + 4, startY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(value, x + 4, startY + 10.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(sub, x + 4, startY + 14);
    };

    drawCard(15, "Total Ganado", `${totalCount} cabezas`, "Sujetos en lote");
    drawCard(15 + cardWidth + cardGap, "Distribución", `${hembras} H / ${machos} M`, "Hembras vs Machos");
    drawCard(15 + (cardWidth + cardGap) * 2, "Peso Promedio", `${avgWeight || "---"} kg`, `${animalsWithWeight.length} pesados`);
    drawCard(15 + (cardWidth + cardGap) * 3, "Raza Principal", topBreed, `${maxCount} cabezas (${Math.round((maxCount / totalCount) * 100)}%)`);

    // --- 3. TABLA DE ANIMALES ---
    const tableRows = animals.map((a) => [
      a.record || `ID-${a.id}`,
      a.name || "---",
      a.sex || a.gender || "---",
      getBreedLabel(a, breedOptions),
      a.weight ? `${a.weight} kg` : "---",
      a.status || "Vivo",
      getAgeLabel(a),
      a.notes ? (a.notes.length > 30 ? a.notes.substring(0, 27) + "..." : a.notes) : "---",
    ]);

    runAutoTable(doc, {
      startY: 68,
      head: [
        [
          "Registro",
          "Nombre",
          "Sexo",
          "Raza",
          "Peso",
          "Estado",
          "Edad aprox.",
          "Notas / Observación",
        ],
      ],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 25 },
        2: { cellWidth: 15 },
        3: { cellWidth: 32 },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 18 },
        6: { cellWidth: 22 },
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data: any) => {
        // Footer en cada página
        const pageCount = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        // Línea divisoria de pie de página
        (doc as any).setStrokeColor(241, 245, 249);
        doc.line(15, 282, 195, 282);

        doc.text(
          "Hacienda Villa Luz • Sistema de Control Ganadero Automático",
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

    // --- 4. SECCIÓN DE FIRMAS Y VALIDEZ (Se dibuja al final de la última tabla) ---
    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // Si no cabe en la página actual, agregar otra página para las firmas
    if (finalY > 250) {
      doc.addPage();
      finalY = 25;
    }

    (doc as any).setStrokeColor(203, 213, 225);
    doc.setLineDashPattern([1.5, 1.5], 0);

    // Cuadro de notas adicionales para el capataz/campesino
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, finalY, 180, 16, 1.5, 1.5, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("ANOTACIONES ADICIONALES DEL CAMPO:", 19, finalY + 4.5);
    doc.setLineDashPattern([], 0);

    finalY += 32;

    // Líneas de firma
    doc.line(20, finalY, 80, finalY);
    doc.line(130, finalY, 190, finalY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Firma del Capataz / Campesino", 20, finalY + 4);
    doc.text("Firma del Veterinario / Administrador", 130, finalY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Nombre:", 20, finalY + 8);
    doc.text("C.C. / ID:", 20, finalY + 11.5);
    doc.text("Nombre:", 130, finalY + 8);
    doc.text("Mat. Prof:", 130, finalY + 11.5);

    // Guardar PDF
    const filename = `VillaLuz_ReporteGanado_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  },

  /**
   * Genera y descarga un reporte CSV estándar para integración con Excel o planillas.
   */
  exportToCSV(animals: AnimalReportData[], breedOptions: Option[]) {
    if (!animals || animals.length === 0) return;

    // Encabezados
    const headers = [
      "Registro",
      "Nombre",
      "Sexo",
      "Raza",
      "Peso (kg)",
      "Estado",
      "Fecha Nacimiento",
      "Edad (meses)",
      "ID Padre",
      "ID Madre",
      "Notas/Observaciones",
    ];

    // Mapeo de filas
    const rows = animals.map((a) => {
      const record = a.record || `ID-${a.id}`;
      const name = a.name || "";
      const sex = a.sex || a.gender || "";
      const breed = getBreedLabel(a, breedOptions);
      const weight = a.weight || "";
      const status = a.status || "Vivo";
      const birthDate = a.birth_date || "";

      let age = "";
      if (a.age_in_months !== undefined && a.age_in_months !== null) {
        age = String(a.age_in_months);
      } else if (a.birth_date) {
        const birth = new Date(a.birth_date);
        if (!isNaN(birth.getTime())) {
          age = String(
            Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
          );
        }
      }

      const father = a.father_id || a.idFather || "";
      const mother = a.mother_id || a.idMother || "";
      const notes = a.notes ? a.notes.replace(/"/g, '""') : "";

      return [
        `"${record}"`,
        `"${name}"`,
        `"${sex}"`,
        `"${breed}"`,
        weight,
        `"${status}"`,
        `"${birthDate}"`,
        age,
        father,
        mother,
        `"${notes}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n"); // Add BOM for excel spanish encoding
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const filename = `VillaLuz_Inventario_${new Date().toISOString().split("T")[0]}.csv`;
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
