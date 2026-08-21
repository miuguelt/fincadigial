import React from 'react';
import { Check, Radio, ScanLine } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';
import { nfcBindingService } from '../api/nfcBinding.service';
import { notifyField } from '../model/fieldFeedback';
import type { NfcTagAnimal } from '../model/types';

/** Un código ISO 11784 completo son 15 dígitos. */
const LF_CODE_LENGTH = 15;

const onlyDigits = (value: string) => value.replace(/\D/g, '');

interface LfCapturePanelProps {
  animals: NfcTagAnimal[];
}

/**
 * Registro del transpondedor de bolo ruminal o inyectable.
 *
 * Estos chips trabajan en 134,2 kHz (ISO 11784/11785) y ningún celular los
 * lee: el NFC del teléfono es de 13,56 MHz, otra banda por completo. Se leen
 * con bastón o lector de mano, que en la práctica se conecta por Bluetooth y
 * se comporta como un teclado. Por eso aquí solo hay una casilla que recibe lo
 * que el lector "escribe", y el mismo campo sirve para digitar el número que
 * viene impreso en el chip.
 *
 * Estos chips vienen grabados de fábrica y son de solo lectura: no se
 * programan, se registran.
 */
export const LfCapturePanel: React.FC<LfCapturePanelProps> = ({ animals }) => {
  const [activeId, setActiveId] = React.useState<number | null>(animals[0]?.id ?? null);
  const [code, setCode] = React.useState('');
  const [saved, setSaved] = React.useState<Record<number, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const active = animals.find((animal) => animal.id === activeId) ?? null;
  const isComplete = code.length === LF_CODE_LENGTH;

  const save = async () => {
    if (!active || !isComplete || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await nfcBindingService.bind({ animalId: active.id, lfTagCode: code });
      setSaved((current) => ({ ...current, [active.id]: code }));
      notifyField('ok', { say: `${active.record} registrado` });
      if (!result.persisted) {
        setError('Sin señal: el registro se enviará solo al recuperar conexión.');
      }
      setCode('');
      // El siguiente animal sin registrar toma el turno para que el lector
      // pueda seguir disparando sin tocar la pantalla.
      const next = animals.find((animal) => animal.id !== active.id && !saved[animal.id]);
      setActiveId(next?.id ?? null);
      inputRef.current?.focus();
    } catch (saveError) {
      notifyField('error');
      setError((saveError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3">
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
        <p className="text-sm leading-6 text-indigo-50/85">
          El bolo y el inyectable trabajan en otra frecuencia y el celular no los alcanza. Conecta
          el bastón lector —se comporta como un teclado— y dispara sobre el animal: el número cae
          solo en la casilla.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-300/60">
          Animal en turno
        </p>
        <FitText
          as="p"
          className="mt-2 text-3xl font-black uppercase tracking-tight text-white"
          maxLines={1}
        >
          {active?.record ?? 'Todos registrados'}
        </FitText>

        <Input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(onlyDigits(event.target.value).slice(0, LF_CODE_LENGTH))}
          onKeyDown={(event) => {
            // El bastón termina su envío con Enter, igual que un teclado.
            if (event.key === 'Enter') void save();
          }}
          inputMode="numeric"
          autoComplete="off"
          disabled={!active}
          placeholder="15 dígitos del transpondedor"
          aria-label="Código del transpondedor"
          className="mt-5 h-16 rounded-2xl border-white/15 bg-slate-950 text-center font-mono text-xl tracking-widest text-white"
        />
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-indigo-300/50">
          {code.length} de {LF_CODE_LENGTH} dígitos
        </p>

        <Button
          onClick={() => void save()}
          disabled={!isComplete || !active || isSaving}
          className="mt-4 h-14 w-full rounded-2xl bg-emerald-500 text-base font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          <ScanLine className="mr-2 h-5 w-5" aria-hidden="true" />
          Registrar en {active?.record ?? 'el animal'}
        </Button>
      </div>

      {error && (
        <p className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-50">
          {error}
        </p>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-2">
          {animals.map((animal) => (
            <li key={animal.id}>
              <button
                type="button"
                onClick={() => setActiveId(animal.id)}
                className={cn(
                  'flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left',
                  animal.id === activeId
                    ? 'border-emerald-400/50 bg-emerald-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                )}
              >
                <span className="min-w-0 flex-1">
                  <FitText as="span" className="block text-base font-semibold text-white" maxLines={1}>
                    {animal.record}
                  </FitText>
                  {saved[animal.id] && (
                    <FitText
                      as="span"
                      className="block font-mono text-[11px] text-emerald-300/70"
                      maxLines={1}
                    >
                      {saved[animal.id]}
                    </FitText>
                  )}
                </span>
                {saved[animal.id] && (
                  <Check className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};
