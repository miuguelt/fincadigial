import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { api } from '@/shared/api/base-client';
import { getTodayColombia } from '@/shared/utils/dateUtils';

import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn.ts';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';

// Services
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { milkService } from '@/entities/milk/api/milk.service';

// Entity Links
import { AnimalLink } from '@/entities/animal/ui/AnimalLink';
import { FieldLink } from '@/entities/field/ui/FieldLink';
import { DiseaseLink } from '@/entities/disease/ui/DiseaseLink';
import { MedicationLink } from '@/entities/medication/ui/MedicationLink';
import { AnimalImageBanner } from '@/widgets/dashboard/animals/AnimalImageBanner';
import { apiClient } from '@/shared/api/client';
import { FinanceModal } from '@/widgets/registro-operativo/modals/FinanceModal';

// Icons
import {
  ArrowLeft,
  Search,
  Wifi,
  WifiOff,
  Clock,
  FileText,
  Download,
  RefreshCw,
  History,
  Printer,
  X,
  Maximize2,
  Minimize2,
  DollarSign
} from 'lucide-react';

import {
  IconCow,
  IconMilk,
  IconRoute as IconRouteCattle,
  IconHealthAlert,
  IconHealthCheck
} from '@/shared/icons/cattle';
import type { FinanceFormData } from '@/widgets/registro-operativo/types';

type RecordType = 'all' | 'milking' | 'transfer' | 'disease' | 'treatment' | 'finance';

interface UnifiedRecord {
  id: string;
  type: 'milking' | 'transfer' | 'disease' | 'treatment';
  date: string;
  animalId: number;
  animalLabel: string;
  entityId?: number; // ID de entidad relacionada (potrero, enfermedad, medicamento)
  entityLabel?: string; // Etiqueta de entidad relacionada
  details: string;
  notes?: string;
  raw: any;
}

export default function GanaderiaOperativaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline, totalOperations } = useOnlineStatus();

  // Dialog / Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isBitacoraFullScreen, setIsBitacoraFullScreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBitacoraFullScreen) {
        setIsBitacoraFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBitacoraFullScreen]);

  const handleDownloadReport = async (animalId: number, record: string) => {
    setDownloadingId(`report-${animalId}`);
    try {
      const response = await apiClient.get(`/exports/animal/${animalId}/health-report.pdf`, { responseType: 'blob' } as any);
      const blob = (response as any).data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `ficha_${record}_${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando reporte:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Master data
  const [animals, setAnimals] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // History data
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<RecordType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form loading states
  const [savingForm, setSavingForm] = useState(false);

  // Check URL query parameters to open modals
  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam) {
      setActiveModal(modalParam);
    } else {
      setActiveModal(null);
    }
  }, [searchParams]);

  const openModal = (type: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', type);
    setSearchParams(newParams);
  };

  const closeModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams);
  };

  // 1. Fetch master data
  const loadMasterData = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const [animalsResp, fieldsResp, diseasesResp, medsResp] = await Promise.all([
        animalsService.getAnimals({ limit: 300, status: 'Vivo' }),
        fieldService.getFields({ limit: 100 }),
        diseaseService.getDiseases({ limit: 100 }),
        medicationsService.getMedications({ limit: 100 })
      ]);

      setAnimals(Array.isArray(animalsResp) ? animalsResp : (animalsResp as any)?.data || []);
      setFields(Array.isArray(fieldsResp) ? fieldsResp : (fieldsResp as any)?.data || []);
      setDiseases(Array.isArray(diseasesResp) ? diseasesResp : (diseasesResp as any)?.data || []);
      setMedications(Array.isArray(medsResp) ? medsResp : (medsResp as any)?.data || []);
    } catch (e) {
      console.error('Error loading master data:', e);
      showToast('Error al cargar datos del ganado', 'error');
    } finally {
      setLoadingMaster(false);
    }
  }, [showToast]);

  // 2. Fetch history records and unify them
  const loadHistoryRecords = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [milkResp, fieldsAssResp, diseasesAssResp, treatmentsResp] = await Promise.all([
        milkService.getAll({ limit: 100, sort_by: 'date', order: 'desc' }),
        animalFieldsService.getAll({ limit: 100, sort_by: 'assignment_date', order: 'desc' }),
        animalDiseasesService.getAll({ limit: 100, sort_by: 'diagnosis_date', order: 'desc' }),
        treatmentsService.getAll({ limit: 100, sort_by: 'treatment_date', order: 'desc' })
      ]);

      const unified: UnifiedRecord[] = [];

      // Create lookup maps for quick labels
      const animalMap = new Map(animals.map(a => [a.id, a]));
      const fieldMap = new Map(fields.map(f => [f.id, f]));
      const diseaseMap = new Map(diseases.map(d => [d.id, d]));
      const medMap = new Map(medications.map(m => [m.id, m]));

      const getAnimalName = (id: number) => {
        const a = animalMap.get(id);
        return a ? `${a.record} - ${a.breed?.name || 'Sin Raza'}` : `Animal ${id}`;
      };

      // Map Milking
      if (Array.isArray(milkResp)) {
        milkResp.forEach((m: any) => {
          const shift = m.milking_session === 'AM' ? 'Mañana' : m.milking_session === 'PM' ? 'Tarde' : 'Total';
          unified.push({
            id: `milking-${m.id}`,
            type: 'milking',
            date: m.date,
            animalId: m.animal_id,
            animalLabel: getAnimalName(m.animal_id),
            details: `${m.liters} Litros (${shift})`,
            notes: m.notes,
            raw: m
          });
        });
      }

      // Map Transfers
      if (Array.isArray(fieldsAssResp)) {
        fieldsAssResp.forEach((tf: any) => {
          const field = fieldMap.get(tf.field_id);
          const fName = field ? field.name : `Campo ${tf.field_id}`;
          unified.push({
            id: `transfer-${tf.id}`,
            type: 'transfer',
            date: tf.assignment_date,
            animalId: tf.animal_id,
            animalLabel: getAnimalName(tf.animal_id),
            entityId: tf.field_id,
            entityLabel: fName,
            details: `Trasladado a Potrero: ${fName}`,
            notes: tf.notes,
            raw: tf
          });
        });
      }

      // Map Diseases
      if (Array.isArray(diseasesAssResp)) {
        diseasesAssResp.forEach((da: any) => {
          const d = diseaseMap.get(da.disease_id);
          const dName = d ? d.name : `Enfermedad ${da.disease_id}`;
          unified.push({
            id: `disease-${da.id}`,
            type: 'disease',
            date: da.diagnosis_date,
            animalId: da.animal_id,
            animalLabel: getAnimalName(da.animal_id),
            entityId: da.disease_id,
            entityLabel: dName,
            details: `Enfermedad: ${dName} (${da.status || 'Activo'})`,
            notes: da.notes,
            raw: da
          });
        });
      }

      // Map Treatments
      if (Array.isArray(treatmentsResp)) {
        treatmentsResp.forEach((t: any) => {
          const med = medMap.get(t.medication_id);
          const mName = med ? med.name : `Medicamento ${t.medication_id}`;
          unified.push({
            id: `treatment-${t.id}`,
            type: 'treatment',
            date: t.treatment_date,
            animalId: t.animal_id,
            animalLabel: getAnimalName(t.animal_id),
            entityId: t.medication_id,
            entityLabel: mName,
            details: `Tratamiento: ${mName} (${t.dosis || t.dose || 'Sin dosis'})`,
            notes: t.notes || t.description,
            raw: t
          });
        });
      }

      // Sort by date descending
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(unified);
    } catch (e) {
      console.error('Error loading history records:', e);
      showToast('Error al cargar historial operativo', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [animals, fields, diseases, medications, showToast]);

  // Load master data once, then load history
  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    if (!loadingMaster) {
      loadHistoryRecords();
    }
  }, [loadingMaster, loadHistoryRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Filter by type
      if (filterType !== 'all' && r.type !== filterType) return false;

      // 2. Filter by search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesAnimal = r.animalLabel.toLowerCase().includes(term);
        const matchesDetails = r.details.toLowerCase().includes(term);
        const matchesNotes = r.notes ? r.notes.toLowerCase().includes(term) : false;
        if (!matchesAnimal && !matchesDetails && !matchesNotes) return false;
      }

      // 3. Filter by date range
      if (startDate && new Date(r.date) < new Date(startDate)) return false;
      if (endDate && new Date(r.date) > new Date(endDate)) return false;

      return true;
    });
  }, [records, filterType, searchTerm, startDate, endDate]);

  // General Statistics (based on loaded records)
  const stats = useMemo(() => {
    let milkTotal = 0;
    let activeDiseases = 0;
    let transfersCount = 0;
    let treatmentsCount = 0;

    records.forEach(r => {
      if (r.type === 'milking') {
        milkTotal += r.raw.liters || 0;
      } else if (r.type === 'disease' && r.raw.status === 'Activo') {
        activeDiseases++;
      } else if (r.type === 'transfer') {
        transfersCount++;
      } else if (r.type === 'treatment') {
        treatmentsCount++;
      }
    });

    return {
      milkTotal: Math.round(milkTotal * 10) / 10,
      activeDiseases,
      transfersCount,
      treatmentsCount
    };
  }, [records]);

  // ----------------------------------------------------
  // REPORT EXPORT UTILITIES (PDF / CSV)
  // ----------------------------------------------------

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      showToast('No hay registros para exportar', 'warning');
      return;
    }

    const headers = ['Fecha', 'Registro Animal', 'Tipo Actividad', 'Detalle/Línea', 'Observaciones'];
    const rows = filteredRecords.map(r => {
      const typeLabel =
        r.type === 'milking' ? 'Ordeño' :
        r.type === 'transfer' ? 'Traslado' :
        r.type === 'disease' ? 'Enfermedad' : 'Tratamiento';
      return [
        r.date,
        `"${r.animalLabel.replace(/"/g, '""')}"`,
        `"${typeLabel}"`,
        `"${r.details.replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VillaLuz_Actividades_Ganaderas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Reporte CSV descargado con éxito', 'success');
  };

  const exportToPDF = () => {
    if (filteredRecords.length === 0) {
      showToast('No hay registros para exportar', 'warning');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header Band
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, 210, 32, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('HACIENDA VILLA LUZ', 15, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(209, 250, 229); // Emerald 100
    doc.text('REPORTE OPERATIVO CONSOLIDADO • GANADERÍA', 15, 20);

    const todayStr = new Date().toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.setFontSize(8);
    doc.setTextColor(167, 243, 208); // Emerald 200
    doc.text(`Generado: ${todayStr}`, 15, 26);

    // Summary Box
    doc.setFillColor(255, 255, 255, 0.15);
    doc.roundedRect(155, 6, 40, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTROS FILTRADOS', 158, 12);
    doc.setFontSize(12);
    doc.text(`${filteredRecords.length} ACTIVIDADES`, 158, 20);

    // Metrics summary on PDF
    doc.setTextColor(31, 41, 55); // Gray 800
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE OPERACIÓN', 15, 42);

    const cardWidth = 42;
    const cardHeight = 15;
    const startY = 46;
    const cardGap = 6;

    const drawCard = (x: number, title: string, value: string) => {
      doc.setFillColor(243, 244, 246); // Gray 100
      doc.setDrawColor(229, 231, 235); // Gray 200
      doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128); // Gray 500
      doc.text(title.toUpperCase(), x + 4, startY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.text(value, x + 4, startY + 10.5);
    };

    drawCard(15, 'Producción Leche', `${stats.milkTotal} Litros`);
    drawCard(15 + cardWidth + cardGap, 'Enfermos Activos', `${stats.activeDiseases} Casos`);
    drawCard(15 + (cardWidth + cardGap) * 2, 'Traslados de Ganado', `${stats.transfersCount} Movs`);
    drawCard(15 + (cardWidth + cardGap) * 3, 'Tratamientos', `${stats.treatmentsCount} Aplicados`);

    // Table mapping
    const tableRows = filteredRecords.map(r => {
      const typeLabel =
        r.type === 'milking' ? 'Ordeño' :
        r.type === 'transfer' ? 'Traslado' :
        r.type === 'disease' ? 'Enfermedad' : 'Tratamiento';
      return [
        r.date,
        r.animalLabel,
        typeLabel,
        r.details,
        r.notes || '---'
      ];
    });

    try {
      const runAutoTable = (docObj: any, options: any) => {
        if (typeof autoTable === 'function') autoTable(docObj, options);
        else if (typeof (autoTable as any).default === 'function')
          (autoTable as any).default(docObj, options);
      };

      runAutoTable(doc, {
        startY: 68,
        head: [['Fecha', 'Vaca/Animal', 'Actividad', 'Detalle', 'Observaciones']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [16, 185, 129], // Emerald 500
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 42, fontStyle: 'bold' },
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
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175); // Gray 400
          doc.line(15, 282, 195, 282);
          doc.text('Hacienda Villa Luz • Sistema Campesino Digital', 15, 287);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            195 - doc.getTextWidth(`Página ${data.pageNumber} de ${pageCount}`),
            287
          );
        }
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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      doc.text('Firma del Capataz / Campesino', 20, finalY + 16);
      doc.text('Firma del Veterinario / Administrador', 130, finalY + 16);

      const filename = `VillaLuz_ReporteOperativo_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      showToast('Reporte PDF descargado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al compilar el PDF', 'error');
    }
  };

  // ----------------------------------------------------
  // SUBMIT FORM HANDLERS
  // ----------------------------------------------------

  // 1. Milking
  const [milkForm, setMilkForm] = useState({
    animalId: '',
    liters: '',
    session: 'Mañana',
    date: getTodayColombia(),
    notes: ''
  });

  const handleMilkingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milkForm.animalId) { showToast('Selecciona el animal', 'error'); return; }
    if (!milkForm.liters || Number(milkForm.liters) < 0) { showToast('Ingresa los litros correctamente', 'error'); return; }

    setSavingForm(true);
    const sessionMapped = milkForm.session === 'Mañana' ? 'AM' : milkForm.session === 'Tarde' ? 'PM' : 'Extra';
    const payload = {
      animal_id: Number(milkForm.animalId),
      date: milkForm.date,
      liters: Number(milkForm.liters),
      milking_session: sessionMapped,
      notes: milkForm.notes || undefined
    };

    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'milk-production', payload);
        showToast('Registro guardado sin señal. Se sincronizará pronto.', 'success');
      } else {
        await api.post('/milk-production', payload);
        showToast('Producción de leche registrada correctamente.', 'success');
      }
      closeModal();
      loadHistoryRecords();
      setMilkForm({ animalId: '', liters: '', session: 'Mañana', date: getTodayColombia(), notes: '' });
    } catch {
      showToast('Error al registrar ordeño. Intente nuevamente.', 'error');
    } finally {
      setSavingForm(false);
    }
  };

  // 2. Transfer
  const [transferForm, setTransferForm] = useState({
    animalId: '',
    fieldId: '',
    date: getTodayColombia()
  });

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.animalId || !transferForm.fieldId) {
      showToast('Seleccione animal y potrero de destino', 'error');
      return;
    }

    setSavingForm(true);
    const payload = {
      animal_id: Number(transferForm.animalId),
      field_id: Number(transferForm.fieldId),
      assignment_date: transferForm.date
    };

    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'animal-fields', payload);
        showToast('Traslado guardado sin señal. Se sincronizará pronto.', 'success');
      } else {
        await animalFieldsService.createAnimalField(payload);
        showToast('Traslado registrado exitosamente', 'success');
      }
      closeModal();
      loadHistoryRecords();
      setTransferForm({ animalId: '', fieldId: '', date: getTodayColombia() });
    } catch {
      showToast('Error al registrar traslado', 'error');
    } finally {
      setSavingForm(false);
    }
  };

  // 3. Disease
  const [diseaseForm, setDiseaseForm] = useState({
    animalId: '',
    diseaseId: '',
    status: 'Activo',
    date: getTodayColombia(),
    notes: ''
  });

  const handleDiseaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseForm.animalId || !diseaseForm.diseaseId) {
      showToast('Seleccione el animal y diagnóstico', 'error');
      return;
    }

    setSavingForm(true);
    const payload = {
      animal_id: Number(diseaseForm.animalId),
      disease_id: Number(diseaseForm.diseaseId),
      diagnosis_date: diseaseForm.date,
      status: diseaseForm.status,
      notes: diseaseForm.notes || undefined,
      instructor_id: user?.id || 0
    };

    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'animal-diseases', payload);
        showToast('Caso clínico guardado sin señal. Se sincronizará pronto.', 'success');
      } else {
        await animalDiseasesService.createAnimalDisease(payload);
        showToast('Diagnóstico registrado exitosamente', 'success');
      }
      closeModal();
      loadHistoryRecords();
      setDiseaseForm({ animalId: '', diseaseId: '', status: 'Activo', date: getTodayColombia(), notes: '' });
    } catch {
      showToast('Error al reportar enfermedad', 'error');
    } finally {
      setSavingForm(false);
    }
  };

  // 4. Treatment
  const [treatmentForm, setTreatmentForm] = useState({
    animalId: '',
    medicationId: '',
    dose: '',
    date: getTodayColombia(),
    description: 'Tratamiento rápido'
  });

  const handleTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatmentForm.animalId || !treatmentForm.medicationId || !treatmentForm.dose) {
      showToast('Por favor, rellene todos los campos requeridos', 'error');
      return;
    }

    setSavingForm(true);
    const payload = {
      animal_id: Number(treatmentForm.animalId),
      medication_id: Number(treatmentForm.medicationId),
      dosis: treatmentForm.dose, // mapped to dosis inside payload builder
      treatment_date: treatmentForm.date,
      description: treatmentForm.description,
      diagnosis: treatmentForm.description || 'Tratamiento rápido'
    };

    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'treatments', payload);
        showToast('Tratamiento guardado sin señal. Se sincronizará pronto.', 'success');
      } else {
        await treatmentsService.createTreatment(payload);
        showToast('Tratamiento registrado exitosamente', 'success');
      }
      closeModal();
      loadHistoryRecords();
      setTreatmentForm({ animalId: '', medicationId: '', dose: '', date: getTodayColombia(), description: 'Tratamiento rápido' });
    } catch {
      showToast('Error al aplicar tratamiento', 'error');
    } finally {
      setSavingForm(false);
    }
  };

  // 5. Finance
  const [financeForm, setFinanceForm] = useState<FinanceFormData>({
    transaction_type: 'Ingreso',
    category: 'Venta de Leche',
    animalId: '',
    amount: '',
    date: getTodayColombia(),
    description: ''
  });

  const handleFinanceSubmit = async (): Promise<boolean> => {
    if (!financeForm.amount || !financeForm.category) { showToast('Complete monto y categoría', 'error'); return false; }
    setSavingForm(true);
    const payload: any = { 
      transaction_type: financeForm.transaction_type, 
      category: financeForm.category, 
      amount: Number(financeForm.amount), 
      date: financeForm.date, 
      description: financeForm.description 
    };
    if (financeForm.animalId) {
      payload.animal_id = Number(financeForm.animalId);
    }
    
    try {
      if (!isOnline) { 
        await offlineQueue.enqueue('POST', 'financial/transactions', payload); 
        showToast('Transacción guardada sin señal. Se sincronizará pronto.', 'success'); 
      } else { 
        await api.post('/financial/transactions', payload); 
        showToast('Transacción registrada exitosamente', 'success'); 
      }
      closeModal(); 
      loadHistoryRecords(); 
      return true;
    } catch { 
      showToast('Error al registrar transacción', 'error'); 
      return false; 
    } finally { 
      setSavingForm(false); 
    }
  };


  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/20 font-sans pb-12">
      {/* ─── ENCABEZADO PRINCIPAL ─── */}
      <header className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-600 px-4 py-8 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute right-0 top-0 w-44 h-44 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute right-12 bottom-0 w-28 h-28 bg-white/5 rounded-full translate-y-10" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/campesino')}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
            </button>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 rounded-lg bg-white/15 border border-white/25 shadow-sm">
                <IconCow className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">Ganadería Operativa</h1>
                <p className="text-emerald-100 text-xs md:text-sm opacity-90 mt-0.5">Control unificado del ganado, registros rápidos y reportes</p>
              </div>
            </div>
          </div>

          {/* Online/Offline status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-semibold">En línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-semibold text-amber-100">Sin conexión</span>
                </>
              )}
            </div>
            {totalOperations > 0 && (
              <div className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-200 border border-amber-500/30 px-3 py-1 rounded-md flex items-center gap-1 animate-pulse">
                <Clock className="w-3.5 h-3.5" /> {totalOperations} pendientes de sincronización
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8">

        {/* ─── TARJETAS DE ACCIONES RÁPIDAS (MODALES) ─── */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Registros y Acciones</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Milk Register */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openModal('milk')}
              className="p-5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md hover:shadow-lg transition-all text-left flex flex-col justify-between h-32 border-0 cursor-pointer relative overflow-hidden"
            >
              <div className="bg-white/20 p-2.5 rounded-xl w-fit"><IconMilk className="w-6 h-6" /></div>
              <div>
                <span className="block font-black text-sm uppercase tracking-wider">Registrar Ordeño</span>
                <span className="block text-[11px] text-white/80 mt-0.5">Producción diaria de vacas</span>
              </div>
              <div className="absolute right-3 top-3 text-white/10 font-bold text-6xl select-none leading-none pointer-events-none">🥛</div>
            </motion.button>

            {/* Transfer Animal */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openModal('transfer')}
              className="p-5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg transition-all text-left flex flex-col justify-between h-32 border-0 cursor-pointer relative overflow-hidden"
            >
              <div className="bg-white/20 p-2.5 rounded-xl w-fit"><IconRouteCattle className="w-6 h-6" /></div>
              <div>
                <span className="block font-black text-sm uppercase tracking-wider">Trasladar Ganado</span>
                <span className="block text-[11px] text-white/80 mt-0.5">Rotación de potreros</span>
              </div>
              <div className="absolute right-3 top-3 text-white/10 font-bold text-6xl select-none leading-none pointer-events-none">🛣️</div>
            </motion.button>

            {/* Disease Register */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openModal('disease')}
              className="p-5 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md hover:shadow-lg transition-all text-left flex flex-col justify-between h-32 border-0 cursor-pointer relative overflow-hidden"
            >
              <div className="bg-white/20 p-2.5 rounded-xl w-fit"><IconHealthAlert className="w-6 h-6" /></div>
              <div>
                <span className="block font-black text-sm uppercase tracking-wider">Reportar Alerta</span>
                <span className="block text-[11px] text-white/80 mt-0.5">Diagnosticar síntomas</span>
              </div>
              <div className="absolute right-3 top-3 text-white/10 font-bold text-6xl select-none leading-none pointer-events-none">🤒</div>
            </motion.button>

            {/* Treatment Register */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openModal('treatment')}
              className="p-5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all text-left flex flex-col justify-between h-32 border-0 cursor-pointer relative overflow-hidden"
            >
              <div className="bg-white/20 p-2.5 rounded-xl w-fit"><IconHealthCheck className="w-6 h-6" /></div>
              <div>
                <span className="block font-black text-sm uppercase tracking-wider">Aplicar Medicina</span>
                <span className="block text-[11px] text-white/80 mt-0.5">Vacunas y tratamientos</span>
              </div>
              <div className="absolute right-3 top-3 text-white/10 font-bold text-6xl select-none leading-none pointer-events-none">💉</div>
            </motion.button>
            
            {/* Finance Register */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openModal('finance')}
              className="p-5 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all text-left flex flex-col justify-between h-32 border-0 cursor-pointer relative overflow-hidden md:col-span-4 lg:col-span-1"
            >
              <div className="bg-white/20 p-2.5 rounded-xl w-fit"><DollarSign className="w-6 h-6" /></div>
              <div>
                <span className="block font-black text-sm uppercase tracking-wider">Ingreso / Gasto</span>
                <span className="block text-[11px] text-white/80 mt-0.5">Ventas, insumos, compras</span>
              </div>
              <div className="absolute right-3 top-3 text-white/10 font-bold text-6xl select-none leading-none pointer-events-none">💰</div>
            </motion.button>
          </div>
        </section>

        {/* ─── RESUMEN OPERATIVO / ESTADÍSTICAS ─── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-900 border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg"><IconMilk className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Leche del Lote</span>
                <span className="block text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.milkTotal} L</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-lg"><IconHealthAlert className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Enfermos Activos</span>
                <span className="block text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.activeDiseases} Casos</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg"><IconRouteCattle className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Traslados Registrados</span>
                <span className="block text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.transfersCount} Movs</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-lg"><IconCow className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ganado Controlado</span>
                <span className="block text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{animals.length} Vacas</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── FILTROS Y HISTORIAL DE REGISTROS ─── */}
        <section className={cn(
          "bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm space-y-6 transition-all duration-200",
          isBitacoraFullScreen && "fixed inset-0 z-[2000] p-6 h-screen w-screen overflow-auto rounded-none flex flex-col"
        )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Historial y Reportes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Consulta la bitácora operativa y exporta reportes de firmas</p>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBitacoraFullScreen(!isBitacoraFullScreen)}
                className="rounded-xl border shadow-sm font-bold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200"
                title={isBitacoraFullScreen ? "Salir de Pantalla Completa (ESC)" : "Pantalla Completa"}
              >
                {isBitacoraFullScreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 mr-1.5 text-emerald-500" /> Salir de Pantalla Completa
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 mr-1.5 text-emerald-500" /> Pantalla Completa
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="rounded-xl border shadow-sm font-bold text-slate-700 bg-white"
              >
                <Download className="w-4 h-4 mr-2 text-slate-500" /> Exportar CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={exportToPDF}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 border-0 text-white font-bold shadow-md shadow-emerald-500/15"
              >
                <Printer className="w-4 h-4 mr-2" /> Descargar Reporte (PDF)
              </Button>
            </div>
          </div>

          {/* Filtering bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar animal, notas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {/* Category filter */}
            <div>
              <Select value={filterType} onValueChange={(v: RecordType) => setFilterType(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-900 rounded-xl border">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Ver todas las labores</SelectItem>
                  <SelectItem value="milking">🥛 Producción Ordeño</SelectItem>
                  <SelectItem value="transfer">🛣️ Traslados</SelectItem>
                  <SelectItem value="disease">🤒 Casos Clínicos</SelectItem>
                  <SelectItem value="treatment">💉 Tratamientos Médicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                placeholder="Fecha inicio"
                title="Fecha Inicio"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="Fecha fin"
                title="Fecha Fin"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
              {(searchTerm || filterType !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="absolute -right-1 -top-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-full p-1 text-[9px] font-extrabold focus:outline-none border-0"
                  title="Limpiar Filtros"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Activity list */}
          {loadingHistory ? (
            <div className="py-12 flex flex-col justify-center items-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-semibold">Cargando bitácora de labores...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-lg">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold text-slate-600 dark:text-slate-300">No hay registros que coincidan</p>
              <p className="text-xs text-slate-400 mt-1">Prueba a limpiar los filtros o registrar una nueva labor desde arriba.</p>
            </div>
          ) : (
            <div className="overflow-hidden border rounded-lg bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Fecha</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Foto</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Animal / Ganado</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Actividad</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Detalle</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Notas</th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                    {filteredRecords.map(r => {
                      const badgeStyles =
                        r.type === 'milking' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' :
                        r.type === 'transfer' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' :
                        r.type === 'disease' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' :
                        'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';

                      const activityLabel =
                        r.type === 'milking' ? 'Ordeño' :
                        r.type === 'transfer' ? 'Traslado' :
                        r.type === 'disease' ? 'Enfermedad' : 'Tratamiento';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                          <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-slate-500">
                            <div className="flex flex-col">
                              <span>{new Date(r.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                              <span className="text-[10px] opacity-60 font-medium">{new Date(r.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/40 shadow-sm bg-muted/30 group-hover:scale-105 transition-transform">
                              <AnimalImageBanner
                                animalId={r.animalId}
                                height="100%"
                                showControls={false}
                                autoPlayInterval={0}
                                hideWhenEmpty={false}
                                objectFit="cover"
                                deferLoad
                              />
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <AnimalLink id={r.animalId} label={r.animalLabel} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-bold border backdrop-blur-sm ${badgeStyles}`}>
                              {r.type === 'milking' && '🥛'}
                              {r.type === 'transfer' && '🛣️'}
                              {r.type === 'disease' && '🤒'}
                              {r.type === 'treatment' && '💉'}
                              {activityLabel}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex flex-wrap items-center gap-2">
                              {r.type === 'milking' ? (
                                <div className="flex items-center gap-1.5 bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                                  <span className="font-black text-amber-600 dark:text-amber-400">{r.raw.liters}L</span>
                                  <span className="text-[10px] opacity-70">({r.raw.milking_session === 'AM' ? 'Mañana' : 'Tarde'})</span>
                                </div>
                              ) : r.type === 'transfer' && r.entityId && r.entityLabel ? (
                                <div className="flex items-center gap-2">
                                  <span className="opacity-60 text-[10px]">Potrero:</span>
                                  <FieldLink id={r.entityId} label={r.entityLabel} />
                                </div>
                              ) : r.type === 'disease' && r.entityId && r.entityLabel ? (
                                <div className="flex items-center gap-2">
                                  <DiseaseLink id={r.entityId} label={r.entityLabel} />
                                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                    r.raw.status === 'Activo' ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
                                  }`}>
                                    {r.raw.status || 'Activo'}
                                  </span>
                                </div>
                              ) : r.type === 'treatment' && r.entityId && r.entityLabel ? (
                                <div className="flex items-center gap-2">
                                  <MedicationLink id={r.entityId} label={r.entityLabel} />
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {r.raw.dosis || r.raw.dose || 'Sin dosis'}
                                  </span>
                                </div>
                              ) : (
                                r.details
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400 max-w-xs fit-clamp italic">
                            {r.notes || '---'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors"
                                title="Descargar Ficha PDF"
                                onClick={(e) => { e.stopPropagation(); handleDownloadReport(r.animalId, r.animalLabel); }}
                                disabled={downloadingId === `report-${r.animalId}`}
                              >
                                {downloadingId === `report-${r.animalId}` ? (
                                  <span className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <AnimalLink id={r.animalId} label={r.animalLabel}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-500 transition-colors"
                                  title="Ver Historial Completo"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              </AnimalLink>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>


      {/* ─── 1. MODAL DE ORDEÑO (MILKING) ─── */}
      <Dialog open={activeModal === 'milk'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="p-0 overflow-hidden rounded-xl" fullWidth={false}>
          <div className="bg-amber-500 px-6 py-5 text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><IconMilk className="w-6 h-6" /></div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider text-white">Registrar Ordeño</DialogTitle>
              <p className="text-xs text-amber-100">Ingrese la producción de leche de la vaca seleccionada</p>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleMilkingSubmit} className="space-y-4">
              {!isOnline && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 font-bold">
                  <WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará localmente
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="milk-animal">¿De qué vaca estás ordeñando? *</Label>
                <Select value={milkForm.animalId} onValueChange={(v) => setMilkForm(prev => ({ ...prev, animalId: v }))}>
                  <SelectTrigger id="milk-animal" className="rounded-xl border h-11 bg-white">
                    <SelectValue placeholder="— Seleccione la vaca —" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {animals.filter(a => a.sex === 'Hembra').map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.record} {a.breed?.name ? `— ${a.breed.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="milk-liters">¿Cuántos litros dio? *</Label>
                  <Input
                    id="milk-liters"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    max="80"
                    placeholder="Ej: 8.5"
                    value={milkForm.liters}
                    onChange={e => setMilkForm(prev => ({ ...prev, liters: e.target.value }))}
                    required
                    className="rounded-xl h-11 border bg-white text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milk-session">Turno / Sesión</Label>
                  <Select value={milkForm.session} onValueChange={(v) => setMilkForm(prev => ({ ...prev, session: v }))}>
                    <SelectTrigger id="milk-session" className="rounded-xl border h-11 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Mañana">🌅 Mañana (AM)</SelectItem>
                      <SelectItem value="Tarde">🌇 Tarde (PM)</SelectItem>
                      <SelectItem value="Total">📊 Total Día (Extra)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="milk-date">Fecha del ordeño *</Label>
                <Input
                  id="milk-date"
                  type="date"
                  value={milkForm.date}
                  onChange={e => setMilkForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="milk-notes">Observaciones (opcional)</Label>
                <Input
                  id="milk-notes"
                  type="text"
                  placeholder="Ej: mastitis, celo, etc."
                  value={milkForm.notes}
                  onChange={e => setMilkForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={savingForm}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-amber-500/10 transition-all active:scale-95"
              >
                {savingForm ? 'Guardando...' : 'Guardar Producción'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── 2. MODAL DE TRASLADO (TRANSFER) ─── */}
      <Dialog open={activeModal === 'transfer'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="p-0 overflow-hidden rounded-xl" fullWidth={false}>
          <div className="bg-emerald-600 px-6 py-5 text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><IconRouteCattle className="w-6 h-6" /></div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider text-white">Trasladar Animal</DialogTitle>
              <p className="text-xs text-emerald-100">Mover un animal a un potrero o lote de destino</p>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              {!isOnline && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 font-bold">
                  <WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará localmente
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tf-animal">Seleccione el animal *</Label>
                <Select value={transferForm.animalId} onValueChange={(v) => setTransferForm(prev => ({ ...prev, animalId: v }))}>
                  <SelectTrigger id="tf-animal" className="rounded-xl border h-11 bg-white">
                    <SelectValue placeholder="— Seleccione el animal —" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {animals.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.record} {a.breed?.name ? `— ${a.breed.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tf-field">Potrero / Lote de Destino *</Label>
                <Select value={transferForm.fieldId} onValueChange={(v) => setTransferForm(prev => ({ ...prev, fieldId: v }))}>
                  <SelectTrigger id="tf-field" className="rounded-xl border h-11 bg-white">
                    <SelectValue placeholder="— Seleccionar potrero —" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {fields.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.name || `Potrero ${f.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tf-date">Fecha de traslado *</Label>
                <Input
                  id="tf-date"
                  type="date"
                  value={transferForm.date}
                  onChange={e => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={savingForm}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-emerald-500/10 transition-all active:scale-95"
              >
                {savingForm ? 'Trasladando...' : 'Confirmar Traslado'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── 3. MODAL DE ENFERMEDAD (DISEASE) ─── */}
      <Dialog open={activeModal === 'disease'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="p-0 overflow-hidden rounded-xl" fullWidth={false}>
          <div className="bg-rose-600 px-6 py-5 text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><IconHealthAlert className="w-6 h-6" /></div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider text-white">Reportar Enfermedad</DialogTitle>
              <p className="text-xs text-rose-100">Registrar un diagnóstico clínico o caso de enfermedad</p>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleDiseaseSubmit} className="space-y-4">
              {!isOnline && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 font-bold">
                  <WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará localmente
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dis-animal">Animal afectado *</Label>
                <Select value={diseaseForm.animalId} onValueChange={(v) => setDiseaseForm(prev => ({ ...prev, animalId: v }))}>
                  <SelectTrigger id="dis-animal" className="rounded-xl border h-11 bg-white">
                    <SelectValue placeholder="— Seleccione el animal —" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {animals.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.record} {a.breed?.name ? `— ${a.breed.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dis-disease">Diagnóstico / Patología *</Label>
                  <Select value={diseaseForm.diseaseId} onValueChange={(v) => setDiseaseForm(prev => ({ ...prev, diseaseId: v }))}>
                    <SelectTrigger id="dis-disease" className="rounded-xl border h-11 bg-white">
                      <SelectValue placeholder="— Seleccione —" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {diseases.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dis-status">Estado inicial del caso</Label>
                  <Select value={diseaseForm.status} onValueChange={(v) => setDiseaseForm(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger id="dis-status" className="rounded-xl border h-11 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Activo">🚨 Activo</SelectItem>
                      <SelectItem value="Recuperado">✅ Recuperado</SelectItem>
                      <SelectItem value="Crónico">⚠️ Crónico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dis-date">Fecha de diagnóstico *</Label>
                <Input
                  id="dis-date"
                  type="date"
                  value={diseaseForm.date}
                  onChange={e => setDiseaseForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dis-notes">Síntomas / Observación</Label>
                <Input
                  id="dis-notes"
                  type="text"
                  placeholder="Ej: fiebre, diarrea, herida en pezuña"
                  value={diseaseForm.notes}
                  onChange={e => setDiseaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={savingForm}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-rose-500/10 transition-all active:scale-95"
              >
                {savingForm ? 'Registrando...' : 'Reportar Caso Clínico'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── 4. MODAL DE TRATAMIENTO (TREATMENT) ─── */}
      <Dialog open={activeModal === 'treatment'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="p-0 overflow-hidden rounded-xl" fullWidth={false}>
          <div className="bg-purple-600 px-6 py-5 text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><IconHealthCheck className="w-6 h-6" /></div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider text-white">Aplicar Medicina</DialogTitle>
              <p className="text-xs text-purple-100">Registrar la dosis de medicamento o vacuna en el animal</p>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleTreatmentSubmit} className="space-y-4">
              {!isOnline && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-700 font-bold">
                  <WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará localmente
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tx-animal">Animal de Tratamiento *</Label>
                <Select value={treatmentForm.animalId} onValueChange={(v) => setTreatmentForm(prev => ({ ...prev, animalId: v }))}>
                  <SelectTrigger id="tx-animal" className="rounded-xl border h-11 bg-white">
                    <SelectValue placeholder="— Seleccione el animal —" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {animals.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.record} {a.breed?.name ? `— ${a.breed.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tx-med">Medicamento / Vacuna *</Label>
                  <Select value={treatmentForm.medicationId} onValueChange={(v) => setTreatmentForm(prev => ({ ...prev, medicationId: v }))}>
                    <SelectTrigger id="tx-med" className="rounded-xl border h-11 bg-white">
                      <SelectValue placeholder="— Seleccione —" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {medications.map(m => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tx-dose">Dosis Administrada *</Label>
                  <Input
                    id="tx-dose"
                    type="text"
                    placeholder="Ej: 5ml, 2 pastillas"
                    value={treatmentForm.dose}
                    onChange={e => setTreatmentForm(prev => ({ ...prev, dose: e.target.value }))}
                    required
                    className="rounded-xl h-11 border bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tx-date">Fecha de tratamiento *</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={treatmentForm.date}
                  onChange={e => setTreatmentForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tx-desc">Motivo / Diagnóstico Rápido</Label>
                <Input
                  id="tx-desc"
                  type="text"
                  placeholder="Ej: desparasitación de rutina, mastitis, etc."
                  value={treatmentForm.description}
                  onChange={e => setTreatmentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl h-11 border bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={savingForm}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-purple-500/10 transition-all active:scale-95"
              >
                {savingForm ? 'Guardando...' : 'Aplicar Medicina'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ─── 5. MODAL DE FINANZAS (FINANCE) ─── */}
      <FinanceModal
        open={activeModal === 'finance'}
        onClose={closeModal}
        form={financeForm}
        setForm={setFinanceForm}
        animals={animals}
        saving={savingForm}
        onSubmit={handleFinanceSubmit}
      />
    </div>
  );
}
