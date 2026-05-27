import { useState, useCallback } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { milkService, MilkBatchEntry } from '@/entities/milk/api/milk.service';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn';

interface ImportResult {
  created: number;
  errors: number;
  error_details: Array<{ index: number; error: string }>;
}

interface MilkBulkImportProps {
  fincaId?: number;
  onSuccess?: () => void;
}

const CSV_TEMPLATE = `animal_id,liters,milking_session,date,fat_percentage,protein_percentage,somatic_cells,notes
123,8.5,AM,2026-05-21,3.5,3.2,150000,
124,7.2,PM,2026-05-21,3.8,3.4,,`;

export function MilkBulkImport({ onSuccess }: MilkBulkImportProps) {
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_produccion_leche.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      showToast('Solo se permiten archivos CSV', 'error');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        showToast('El archivo CSV está vacío o solo tiene encabezados', 'error');
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      let batchDate = new Date().toISOString().split('T')[0];
      const entries: MilkBatchEntry[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        if (values.length < 3) continue;

        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        const entryDate = row.date || new Date().toISOString().split('T')[0];
        if (i === 1) {
          batchDate = entryDate;
        }

        const entry: MilkBatchEntry = {
          animal_id: parseInt(row.animal_id),
          liters: parseFloat(row.liters),
          milking_session: (row.milking_session as 'AM' | 'PM' | 'Extra') || 'AM',
        };

        if (row.fat_percentage) entry.fat_percentage = parseFloat(row.fat_percentage);
        if (row.protein_percentage) entry.protein_percentage = parseFloat(row.protein_percentage);
        if (row.somatic_cells) entry.somatic_cells = parseInt(row.somatic_cells);
        if (row.notes) entry.notes = row.notes;

        if (entry.animal_id && entry.liters) {
          entries.push(entry);
        }
      }

      if (entries.length === 0) {
        showToast('No se encontraron registros válidos en el CSV', 'error');
        setIsProcessing(false);
        return;
      }

      const result = await milkService.createBatch({
        date: batchDate,
        entries: entries,
      });

      setImportResult(result.data || result);
      showToast(
        `Importación completada: ${result.data?.created || result.created} registros, ${result.data?.errors || result.errors} errores`,
        result.data?.errors || result.errors > 0 ? 'warning' : 'success'
      );
      onSuccess?.();
    } catch (error: any) {
      showToast(error.message || 'Error al procesar el archivo', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [showToast, onSuccess]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Importación Masiva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Plantilla CSV
          </Button>
        </div>

        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
            isProcessing && 'opacity-50 pointer-events-none'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-gray-500">Procesando archivo...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 font-medium">Arrastra un archivo CSV aquí</p>
              <p className="text-gray-400 text-sm mt-1">o</p>
              <label className="mt-2">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  Seleccionar archivo
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              {fileName && (
                <p className="text-sm text-gray-500 mt-2">{fileName}</p>
              )}
            </>
          )}
        </div>

        {importResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={importResult.errors > 0 ? 'destructive' : 'default'}>
                {importResult.errors > 0 ? (
                  <AlertCircle className="h-3 w-3 mr-1" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {importResult.created} importados, {importResult.errors} errores
              </Badge>
            </div>

            {importResult.error_details && importResult.error_details.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    {importResult.error_details.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Fila {err.index + 1}: {err.error}
                      </li>
                    ))}
                    {importResult.error_details.length > 5 && (
                      <li className="text-gray-500">
                        ... y {importResult.error_details.length - 5} errores más
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Formato requerido:</strong> animal_id, liters, milking_session (AM/PM/Extra), date (YYYY-MM-DD).
            Campos opcionales: fat_percentage, protein_percentage, somatic_cells, notes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
