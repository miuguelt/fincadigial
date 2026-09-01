import React from 'react';
import { Printer, TriangleAlert } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { SETUP_STEPS } from '../model/helpSteps';
import type { NfcSupport } from '../model/nfcSupport';
import { NfcHelpSteps } from './NfcHelpSteps';

interface NfcSupportNoticeProps {
  support: NfcSupport;
}

/**
 * Qué hacer cuando este celular todavía no puede grabar chapetas.
 *
 * No basta con decir «no compatible»: quien está en la finca necesita saber
 * qué equipo conseguir y qué tocar para dejarlo listo. Por eso el aviso trae
 * los cuatro pasos completos y no solo el motivo del bloqueo.
 */
export const NfcSupportNotice: React.FC<NfcSupportNoticeProps> = ({ support }) => (
  <ScrollArea className="h-full">
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-5 sm:p-8">
      <div className="flex items-start gap-4 rounded-3xl border border-amber-400/40 bg-amber-500/10 p-5">
        <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-6 text-white">{support.reason}</h3>
          {support.hint && (
            <p className="mt-2 text-[15px] leading-6 text-amber-50/85">{support.hint}</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-4 text-base font-black uppercase tracking-wider text-emerald-300">
          Para poder grabar las chapetas
        </h4>
        <NfcHelpSteps steps={SETUP_STEPS} />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <Printer className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
        <p className="text-[15px] leading-6 text-indigo-100/80">
          Mientras tanto puede seguir trabajando: en la pestaña{' '}
          <strong className="font-bold text-white">Etiqueta QR</strong> imprime las etiquetas de
          papel, y eso funciona desde cualquier celular o computador.
        </p>
      </div>
    </div>
  </ScrollArea>
);
