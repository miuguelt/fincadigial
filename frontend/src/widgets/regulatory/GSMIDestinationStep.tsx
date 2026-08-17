import React from 'react';
import { ArrowRight, Building2, Truck, Users } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  GSMIDestinationValues,
  MovementDestinationType,
} from './gsmI.types';

interface GSMIDestinationStepProps {
  fincaName: string;
  fincaDane: string;
  destinationType: MovementDestinationType;
  values: GSMIDestinationValues;
  onDestinationTypeChange: (type: MovementDestinationType) => void;
  onValueChange: (field: keyof GSMIDestinationValues, value: string) => void;
  onNext: () => void;
}

const destinationOptions: Array<{
  type: MovementDestinationType;
  label: string;
  icon: React.ReactNode;
  activeClassName: string;
}> = [
  {
    type: 'slaughterhouse',
    label: 'Planta de Beneficio / Frigorífico',
    icon: <Building2 className="w-4 h-4" />,
    activeClassName: 'bg-rose-600 text-white border-rose-600',
  },
  {
    type: 'auction',
    label: 'Subasta Ganadera',
    icon: <Users className="w-4 h-4" />,
    activeClassName: 'bg-indigo-600 text-white border-indigo-600',
  },
  {
    type: 'other_farm',
    label: 'Otro Predio (Ceba/Cría)',
    icon: <Building2 className="w-4 h-4" />,
    activeClassName: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    type: 'fair',
    label: 'Feria / Exposición',
    icon: <Building2 className="w-4 h-4" />,
    activeClassName: 'bg-amber-600 text-white border-amber-600',
  },
];

const inputClassName = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold';

export const GSMIDestinationStep: React.FC<GSMIDestinationStepProps> = ({
  fincaName,
  fincaDane,
  destinationType,
  values,
  onDestinationTypeChange,
  onValueChange,
  onNext,
}) => (
  <div className="space-y-4">
    <div className="p-3.5 rounded-2xl bg-muted/60 border border-border space-y-1">
      <span className="text-[11px] font-black uppercase text-muted-foreground">Predio Origen:</span>
      <p className="text-sm font-black text-foreground">{fincaName}</p>
      <p className="text-xs text-muted-foreground">Código DANE ICA: {fincaDane}</p>
    </div>

    <div>
      <label className="block text-xs font-bold text-foreground mb-1.5">Finalidad / Tipo de Destino:</label>
      <div className="grid grid-cols-2 gap-2">
        {destinationOptions.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => onDestinationTypeChange(option.type)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              destinationType === option.type
                ? option.activeClassName
                : 'bg-card border-border hover:bg-muted/40'
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <label>
        <span className="block text-xs font-bold text-foreground mb-1">Nombre Predio/Frigorífico Destino</span>
        <input
          type="text"
          value={values.name}
          onChange={(event) => onValueChange('name', event.target.value)}
          className={inputClassName}
          placeholder="Ej: Frigorífico Guadalupe"
        />
      </label>

      <label>
        <span className="block text-xs font-bold text-foreground mb-1">Municipio y Dpto Destino</span>
        <input
          type="text"
          value={values.municipality}
          onChange={(event) => onValueChange('municipality', event.target.value)}
          className={inputClassName}
          placeholder="Ej: Medellín, Antioquia"
        />
      </label>

      <label>
        <span className="block text-xs font-bold text-foreground mb-1">Comprador / Titular Receptor</span>
        <input
          type="text"
          value={values.receiverName}
          onChange={(event) => onValueChange('receiverName', event.target.value)}
          className={inputClassName}
        />
      </label>

      <label>
        <span className="block text-xs font-bold text-foreground mb-1">Cédula o NIT Receptor</span>
        <input
          type="text"
          value={values.receiverId}
          onChange={(event) => onValueChange('receiverId', event.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="col-span-2">
        <span className="block text-xs font-bold text-foreground mb-1">Código DANE Destino (12 Dígitos)</span>
        <input
          type="text"
          value={values.dane}
          onChange={(event) => onValueChange('dane', event.target.value)}
          className={`${inputClassName} font-mono`}
          placeholder="050010098765"
        />
      </label>
    </div>

    <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Truck className="w-4 h-4 text-emerald-600" />
        Vehículo y Conductor
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label>
          <span className="block text-[11px] font-bold text-foreground mb-1">Placa Camión</span>
          <input
            type="text"
            value={values.truckPlate}
            onChange={(event) => onValueChange('truckPlate', event.target.value.toUpperCase())}
            className={`${inputClassName} font-black uppercase`}
            placeholder="WOB-123"
          />
        </label>

        <label>
          <span className="block text-[11px] font-bold text-foreground mb-1">Nombre Conductor</span>
          <input
            type="text"
            value={values.driverName}
            onChange={(event) => onValueChange('driverName', event.target.value)}
            className={inputClassName}
          />
        </label>

        <label>
          <span className="block text-[11px] font-bold text-foreground mb-1">Cédula Conductor</span>
          <input
            type="text"
            value={values.driverId}
            onChange={(event) => onValueChange('driverId', event.target.value)}
            className={inputClassName}
          />
        </label>

        <label>
          <span className="block text-[11px] font-bold text-foreground mb-1">Fecha Despacho</span>
          <input
            type="date"
            value={values.movementDate}
            onChange={(event) => onValueChange('movementDate', event.target.value)}
            className={inputClassName}
          />
        </label>
      </div>
    </div>

    <Button
      type="button"
      onClick={onNext}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3 text-sm font-black flex items-center justify-center gap-2"
    >
      <span>Continuar a Selección de Ganado</span>
      <ArrowRight className="w-4 h-4" />
    </Button>
  </div>
);
