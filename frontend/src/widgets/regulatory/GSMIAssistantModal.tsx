import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ModalWrapper } from '@/widgets/registro-operativo/modals/ModalWrapper';
import { animalsService } from '@/entities/animal/api/animal.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { GSMIAnimalSelectionStep } from './GSMIAnimalSelectionStep';
import { GSMIDestinationStep } from './GSMIDestinationStep';
import { GSMISummaryStep } from './GSMISummaryStep';
import {
  GSMIAnimalCategories,
  GSMIDestinationValues,
  MovementDestinationType,
} from './gsmI.types';

interface GSMIAssistantModalProps {
  open: boolean;
  onClose: () => void;
  animals?: any[];
  fincaName?: string;
  fincaDane?: string;
}

export const GSMIAssistantModal: React.FC<GSMIAssistantModalProps> = ({
  open,
  onClose,
  animals: initialAnimals = [],
  fincaName = 'Finca Villa Luz',
  fincaDane = '050010012345',
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [animalsList, setAnimalsList] = useState<any[]>(initialAnimals);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [destType, setDestType] = useState<MovementDestinationType>('slaughterhouse');
  const [destName, setDestName] = useState('Frigorífico Central Guadalupe');
  const [destMunicipality, setDestMunicipality] = useState('Medellín, Antioquia');
  const [destDane, setDestDane] = useState('050010098765');
  const [receiverName, setReceiverName] = useState('Comercializadora de Ganados S.A.S.');
  const [receiverId, setReceiverId] = useState('900.123.456-7');
  const [truckPlate, setTruckPlate] = useState('WOB-456');
  const [driverName, setDriverName] = useState('Carlos Mario Restrepo');
  const [driverId, setDriverId] = useState('71.234.567');
  const [movementDate, setMovementDate] = useState(getTodayColombia());
  const [activeWithdrawals, setActiveWithdrawals] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!open) return;

    setStep(1);
    if (initialAnimals.length > 0) {
      setAnimalsList(initialAnimals);
    } else {
      setLoadingAnimals(true);
      animalsService
        .getAnimals({ limit: 500, status: 'Vivo' })
        .then((response: any) => {
          const list = response?.data ?? response?.items ?? response ?? [];
          setAnimalsList(Array.isArray(list) ? list : []);
        })
        .catch((error) => console.warn('Error cargando animales para GSMI:', error))
        .finally(() => setLoadingAnimals(false));
    }

    treatmentsService
      .getTreatments({ limit: 500 })
      .then((response: any) => {
        const list = response?.data ?? response?.items ?? response ?? [];
        const today = getTodayColombia();
        const withdrawals = new Map<number, string>();
        if (Array.isArray(list)) {
          list.forEach((treatment: any) => {
            if (
              treatment.withdrawal_end_date &&
              treatment.withdrawal_end_date >= today &&
              treatment.animal_id
            ) {
              withdrawals.set(Number(treatment.animal_id), treatment.withdrawal_end_date);
            }
          });
        }
        setActiveWithdrawals(withdrawals);
      })
      .catch(() => {});
  }, [open, initialAnimals]);

  const filteredAnimals = useMemo(
    () =>
      animalsList.filter((animal) => {
        const record = String(animal.record ?? animal.id).toLowerCase();
        const breed = String(animal.breed?.name ?? animal.breed_name ?? '').toLowerCase();
        const term = searchTerm.toLowerCase();
        if (!record.includes(term) && !breed.includes(term)) return false;
        if (categoryFilter === 'males') return animal.sex === 'Macho';
        if (categoryFilter === 'females') return animal.sex === 'Hembra';
        if (categoryFilter === 'calves') return (animal.weight || 0) < 180;
        return true;
      }),
    [animalsList, searchTerm, categoryFilter],
  );

  const selectedAnimals = useMemo(
    () => animalsList.filter((animal) => selectedAnimalIds.has(animal.id)),
    [animalsList, selectedAnimalIds],
  );

  const withdrawalAnimalsInSelection = useMemo(
    () => selectedAnimals.filter((animal) => activeWithdrawals.has(animal.id)),
    [selectedAnimals, activeWithdrawals],
  );

  const icaCategories = useMemo<GSMIAnimalCategories>(() => {
    const counts: GSMIAnimalCategories = {
      'Machos Ceba (Gordos >400kg)': { count: 0, weightSum: 0, animals: [] },
      'Machos Levante (200-400kg)': { count: 0, weightSum: 0, animals: [] },
      'Toros Reproductores': { count: 0, weightSum: 0, animals: [] },
      'Novillas de Vientre': { count: 0, weightSum: 0, animals: [] },
      'Vacas de Cría / Ordeño': { count: 0, weightSum: 0, animals: [] },
      'Vacas de Descarte': { count: 0, weightSum: 0, animals: [] },
      'Terneros / Crías (<200kg)': { count: 0, weightSum: 0, animals: [] },
    };

    selectedAnimals.forEach((animal) => {
      const weight = Number(animal.weight) || 0;
      const sex = animal.sex || 'Macho';
      let category = 'Novillas de Vientre';

      if (weight < 200) {
        category = 'Terneros / Crías (<200kg)';
      } else if (sex === 'Macho') {
        category = weight >= 420 ? 'Machos Ceba (Gordos >400kg)' : 'Machos Levante (200-400kg)';
      } else {
        category = weight >= 400 ? 'Vacas de Cría / Ordeño' : 'Novillas de Vientre';
      }

      counts[category].count += 1;
      counts[category].weightSum += weight;
      counts[category].animals.push(animal);
    });

    return counts;
  }, [selectedAnimals]);

  const totalSelectedWeight = useMemo(
    () => selectedAnimals.reduce((sum, animal) => sum + (Number(animal.weight) || 0), 0),
    [selectedAnimals],
  );

  const destinationValues: GSMIDestinationValues = {
    name: destName,
    municipality: destMunicipality,
    dane: destDane,
    receiverName,
    receiverId,
    truckPlate,
    driverName,
    driverId,
    movementDate,
  };

  const handleDestinationValueChange = (field: keyof GSMIDestinationValues, value: string) => {
    const setters: Record<keyof GSMIDestinationValues, (nextValue: string) => void> = {
      name: setDestName,
      municipality: setDestMunicipality,
      dane: setDestDane,
      receiverName: setReceiverName,
      receiverId: setReceiverId,
      truckPlate: setTruckPlate,
      driverName: setDriverName,
      driverId: setDriverId,
      movementDate: setMovementDate,
    };
    setters[field](value);
  };

  const toggleSelectAll = () => {
    if (selectedAnimalIds.size === filteredAnimals.length && filteredAnimals.length > 0) {
      setSelectedAnimalIds(new Set());
    } else {
      setSelectedAnimalIds(new Set(filteredAnimals.map((animal) => animal.id)));
    }
  };

  const toggleSelectAnimal = (id: number) => {
    setSelectedAnimalIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyChapetas = () => {
    const chapetas = selectedAnimals.map((animal) => animal.record || `#${animal.id}`).join(', ');
    navigator.clipboard.writeText(chapetas);
    showToast(`📋 ${selectedAnimals.length} chapetas copiadas al portapapeles`, 'success');
  };

  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF() as any;
      doc.setFillColor(22, 101, 52);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INSTITUTO COLOMBIANO AGROPECUARIO - ICA', 105, 13, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('BORRADOR DE GUÍA SANITARIA DE MOVILIZACIÓN INTERNA (GSMI)', 105, 22, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Fecha de Emisión: ${movementDate} | Sistema Finca Villa Luz`, 105, 28, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');

      autoTable(doc, {
        startY: 36,
        head: [['1. PREDIO ORIGEN (EXPEDIDOR)', '2. PREDIO DESTINO (RECEPTOR)']],
        body: [[
          `Nombre: ${fincaName}\nCódigo DANE: ${fincaDane}\nMunicipio: Colombia\nTitular: Administrador Registrado`,
          `Nombre: ${destName}\nCódigo DANE: ${destDane}\nMunicipio: ${destMunicipality}\nTitular/Receptor: ${receiverName} (${receiverId})`,
        ]],
        theme: 'grid',
        headStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 3,
        head: [['3. INFORMACIÓN DEL TRANSPORTE TERRESTRE']],
        body: [[
          `Vehículo / Placa: ${truckPlate}   |   Conductor: ${driverName}   |   Cédula: ${driverId}   |   Fecha Despacho: ${movementDate}`,
        ]],
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });

      const categoryRows = Object.entries(icaCategories)
        .filter(([, data]) => data.count > 0)
        .map(([category, data]) => [
          category,
          String(data.count),
          `${data.weightSum.toLocaleString('es-CO')} kg`,
          `${data.count > 0 ? Math.round(data.weightSum / data.count) : 0} kg`,
        ]);
      categoryRows.push([
        'TOTAL LOTE A MOVILIZAR',
        String(selectedAnimals.length),
        `${totalSelectedWeight.toLocaleString('es-CO')} kg`,
        `${selectedAnimals.length > 0 ? Math.round(totalSelectedWeight / selectedAnimals.length) : 0} kg`,
      ]);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 3,
        head: [['CATEGORÍA ZOOTÉCNICA ICA', 'CANTIDAD', 'PESO TOTAL', 'PESO PROMEDIO']],
        body: categoryRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      const animalRows = selectedAnimals.map((animal, index) => [
        String(index + 1),
        animal.record || `#${animal.id}`,
        animal.sex || 'Macho',
        animal.breed?.name || animal.breed_name || 'Común',
        animal.weight ? `${animal.weight} kg` : 'S/P',
        'Vigente (Fedegán)',
        'Negativo / Libre',
      ]);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 3,
        head: [['N°', 'CHAPETA / SINIGAN', 'SEXO', 'RAZA', 'PESO', 'AFTOSA', 'BRUCELOSIS']],
        body: animalRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 1.5 },
      });

      const finalY = Math.min((doc as any).lastAutoTable.finalY + 15, 270);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('__________________________________', 30, finalY);
      doc.text('FIRMA GANADERO EXPEDIDOR', 30, finalY + 4);
      doc.text('C.C. ___________________________', 30, finalY + 8);
      doc.text('__________________________________', 130, finalY);
      doc.text('FIRMA CONDUCTOR / TRANSPORTADOR', 130, finalY + 4);
      doc.text(`C.C. ${driverId}`, 130, finalY + 8);
      doc.save(`Borrador_GSMI_ICA_${fincaName.replace(/\s+/g, '_')}_${movementDate}.pdf`);
      showToast('📄 Borrador de GSMI descargado en PDF con éxito', 'success');
    } catch (error) {
      console.error('Error generando PDF de GSMI:', error);
      showToast('Error al generar PDF de la GSMI', 'error');
    }
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="📜 Asistente de Guía de Movilización ICA (GSMI)">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStep(value as 1 | 2 | 3)}
              disabled={value === 3 && selectedAnimalIds.size === 0}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                step === value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-muted/50 border-border disabled:opacity-50'
              }`}
            >
              {value === 1 && '1. Destino y Ruta'}
              {value === 2 && `2. Ganado (${selectedAnimalIds.size})`}
              {value === 3 && '3. Resumen y PDF'}
            </button>
          ))}
        </div>

        {step === 1 && (
          <GSMIDestinationStep
            fincaName={fincaName}
            fincaDane={fincaDane}
            destinationType={destType}
            values={destinationValues}
            onDestinationTypeChange={setDestType}
            onValueChange={handleDestinationValueChange}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <GSMIAnimalSelectionStep
            animals={filteredAnimals}
            withdrawalAnimals={withdrawalAnimalsInSelection}
            loading={loadingAnimals}
            selectedIds={selectedAnimalIds}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
            activeWithdrawals={activeWithdrawals}
            destinationType={destType}
            onSearchChange={setSearchTerm}
            onCategoryChange={setCategoryFilter}
            onToggleAll={toggleSelectAll}
            onToggleAnimal={toggleSelectAnimal}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <GSMISummaryStep
            selectedAnimals={selectedAnimals}
            totalSelectedWeight={totalSelectedWeight}
            categories={icaCategories}
            onCopy={handleCopyChapetas}
            onGeneratePdf={handleGeneratePDF}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </ModalWrapper>
  );
};

export type { MovementDestinationType } from './gsmI.types';
