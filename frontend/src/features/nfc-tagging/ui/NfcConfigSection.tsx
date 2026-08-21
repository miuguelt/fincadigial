import React from 'react';
import { Cpu, Lock, MessageSquare, ShieldCheck, WifiOff } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { OptionToggleGroup } from '@/shared/ui/OptionToggleGroup';
import { TAG_CAPACITIES } from '../model/ndefPayload';
import type { NfcTagSettings, NfcTagType } from '../model/types';

const TAG_OPTIONS = (Object.keys(TAG_CAPACITIES) as NfcTagType[]).map((value) => ({
  value,
  label: value.replace('_', ' '),
}));

interface ToggleRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  danger?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  danger,
}) => (
  <label
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors',
      checked
        ? danger
          ? 'border-red-400/40 bg-red-500/10'
          : 'border-emerald-400/40 bg-emerald-500/10'
        : 'border-white/10 bg-white/[0.03]'
    )}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
    />
    <span className="min-w-0">
      <span className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon size={15} aria-hidden="true" />
        {title}
      </span>
      <span className="mt-1 block text-xs leading-5 text-indigo-200/60">{description}</span>
    </span>
  </label>
);

interface NfcConfigSectionProps {
  settings: NfcTagSettings;
  onChange: (settings: NfcTagSettings) => void;
}

/**
 * Ajustes de grabación de los aretes NFC.
 *
 * Cada opción cambia algo que se nota en el potrero, no una preferencia
 * cosmética: cuánto cabe en el chip, cuánto se demora cada animal y si el
 * arete se puede volver a usar.
 */
export const NfcConfigSection: React.FC<NfcConfigSectionProps> = ({ settings, onChange }) => {
  const patch = (partial: Partial<NfcTagSettings>) => onChange({ ...settings, ...partial });

  return (
    <div className="space-y-5 rounded-[2rem] border border-white/10 bg-[#020617] p-5 shadow-inner">
      <OptionToggleGroup
        legend="Chip del arete"
        icon={Cpu}
        tone="emerald"
        options={TAG_OPTIONS}
        value={settings.tagType}
        onChange={(tagType) => patch({ tagType })}
        hint={`Capacidad útil: ${TAG_CAPACITIES[settings.tagType]} bytes. Viene impreso en la bolsa de los aretes.`}
      />

      <div className="space-y-2">
        <ToggleRow
          icon={WifiOff}
          title="Ficha sin señal en el arete"
          description="Graba nombre, sexo, raza y nacimiento dentro del chip. Permite identificar al animal en el potrero sin datos ni cobertura."
          checked={settings.includeSnapshot}
          onChange={(includeSnapshot) => patch({ includeSnapshot })}
        />
        <ToggleRow
          icon={ShieldCheck}
          title="Comprobar después de grabar"
          description="Pide retirar y volver a acercar el arete para confirmar que quedó bien. Cuesta unos segundos y evita tener que volver a encerrar al animal."
          checked={settings.verifyAfterWrite}
          onChange={(verifyAfterWrite) => patch({ verifyAfterWrite })}
        />
        <ToggleRow
          icon={MessageSquare}
          title="Avisar por voz"
          description="Dice en voz alta el resultado de cada animal para no tener que mirar la pantalla."
          checked={settings.voiceFeedback}
          onChange={(voiceFeedback) => patch({ voiceFeedback })}
        />
        <ToggleRow
          icon={Lock}
          danger
          title="Bloquear el arete para siempre"
          description="Nadie podrá reescribirlo, tampoco tú. No tiene vuelta atrás y el arete no se puede reutilizar en otro animal. Actívalo solo para animales de venta o certificación."
          checked={settings.lockAfterWrite}
          onChange={(lockAfterWrite) => patch({ lockAfterWrite })}
        />
      </div>
    </div>
  );
};
