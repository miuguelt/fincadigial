import React from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { TROUBLESHOOT_STEPS, USAGE_STEPS } from '../model/helpSteps';
import { NfcHelpSteps } from './NfcHelpSteps';
import { NfcPhoneDiagram } from './NfcPhoneDiagram';

interface NfcUsageHelpProps {
  /** Abierta la primera vez y cerrada después de la primera jornada. */
  defaultOpen?: boolean;
}

/**
 * «¿Cómo se hace?»: la explicación de uso, al alcance de un toque.
 *
 * Va abierta mientras no se haya grabado ningún arete y se puede cerrar
 * después: quien ya marcó cien animales no necesita volver a leerla, pero
 * quien llega nuevo a la finca no debería tener que preguntarle a nadie.
 */
export const NfcUsageHelp: React.FC<NfcUsageHelpProps> = ({ defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/12 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex min-h-[3.5rem] w-full items-center gap-3 px-5 py-4 text-left"
      >
        <HelpCircle className="h-6 w-6 shrink-0 text-emerald-300" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-base font-bold text-white">
          ¿Cómo se graba un arete?
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-indigo-300/70 transition-transform',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="space-y-7 border-t border-white/10 px-5 pb-6 pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <NfcPhoneDiagram className="mx-auto h-44 w-auto shrink-0 text-indigo-200" />
            <NfcHelpSteps steps={USAGE_STEPS} className="min-w-0 flex-1" />
          </div>

          <p className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-4 text-[15px] leading-6 text-emerald-50/90">
            No tienes que estar mirando la pantalla: el celular vibra, suena y dice en voz alta el
            nombre de cada animal apenas queda grabado.
          </p>

          <div>
            <h4 className="mb-4 text-base font-black uppercase tracking-wider text-amber-300">
              Si algo no sale
            </h4>
            <NfcHelpSteps steps={TROUBLESHOOT_STEPS} numbered={false} tone="amber" />
          </div>
        </div>
      )}
    </section>
  );
};
