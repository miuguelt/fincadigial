export type PaperFormat = "A4" | "Letter" | "Label";

export const getPrintStyles = (format: PaperFormat) => {
  const cols = format === "Label" ? 4 : 3;
  return `
    @media print {
      @page { margin: 0; size: auto; }
      body { margin: 1.5cm; background: white !important; font-family: system-ui, sans-serif; }
      .no-print { display: none !important; }
      .tag-grid { display: grid !important; grid-template-columns: repeat(${cols}, 1fr) !important; gap: 25px !important; width: 100% !important; }
      .animal-tag { break-inside: avoid !important; page-break-inside: avoid !important; border: 2px solid #e2e8f0 !important; border-radius: 20px !important; padding: 24px !important; display: flex !important; flex-direction: column !important; align-items: center !important; background: white !important; text-align: center !important; }
      .tag-header { display: flex !important; justify-content: space-between !important; width: 100% !important; margin-bottom: 15px !important; }
      .badge { background: #059669 !important; color: white !important; padding: 2px 8px !important; border-radius: 4px !important; font-size: 9px !important; font-weight: 900 !important; text-transform: uppercase !important; }
      .qr-container { border: 1px solid #f1f5f9 !important; padding: 10px !important; border-radius: 12px !important; margin-bottom: 15px !important; }
      .record-text { font-size: 20px !important; font-weight: 900 !important; color: #0f172a !important; margin: 0 0 4px 0 !important; }
      .sub-text { font-size: 11px !important; font-weight: 700 !important; color: #64748b !important; text-transform: uppercase !important; }
      .details-container { display: flex !important; gap: 10px !important; width: 100% !important; margin-top: 12px !important; }
      .details-item { flex: 1 !important; border: 1px solid #e2e8f0 !important; padding: 6px !important; border-radius: 8px !important; font-size: 10px !important; font-weight: 600 !important; color: #475569 !important; text-align: center !important; }
    }
  `;
};

export const handlePrint = (printRef: HTMLDivElement | null, format: PaperFormat) => {
  if (!printRef) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Etiquetas Villa Luz - ${new Date().toLocaleDateString()}</title>
        <meta charset="UTF-8">
        <style>${getPrintStyles(format)}</style>
      </head>
      <body>
        <div class="tag-grid">${printRef.innerHTML}</div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
