import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, Send, Stethoscope, User } from 'lucide-react';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { getCategoryConfig, PRIORITY_CONFIG } from './assistance.constants';

interface Props {
  item: TechnicalAssistanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: TechnicalAssistanceRequest, notes: string, resolved: boolean) => Promise<void>;
}

function CaseHeader({ item }: { item: TechnicalAssistanceRequest }) {
  const category = getCategoryConfig(item.category || 'otro');
  const priority = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  return (
    <><header className="flex min-w-0 items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Stethoscope className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Respuesta veterinaria</p>
        <h2 className="mt-1 text-lg font-black leading-tight text-foreground">{item.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={priority.badge} size="sm">{priority.label}</Badge><span className="text-xs font-bold text-muted-foreground">{category.label}</span></div>
      </div>
    </header>
    <section className="rounded-xl border border-border/40 bg-muted/25 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground"><User className="h-4 w-4" aria-hidden /> Solicitó {item.requester?.fullname || 'un miembro de la finca'}</div>
      <p className="text-sm leading-relaxed text-foreground">{item.description || 'La solicitud no incluye una descripción.'}</p>
    </section></>
  );
}

function ResponseEditor({ notes, setNotes }: { notes: string; setNotes: (value: string) => void }) {
  return (
    <section className="space-y-2">
      <label htmlFor="veterinarian-response" className="flex items-center gap-2 text-sm font-black text-foreground"><MessageSquareText className="h-4 w-4 text-primary" aria-hidden /> Orientación para el solicitante</label>
      <textarea id="veterinarian-response" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Explica qué observaste, qué debe hacer ahora y cuándo debería volver a consultar..." className="min-h-36 w-full resize-y rounded-xl border border-border/60 bg-background p-4 text-base leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"></textarea>
      <p className="text-xs text-muted-foreground">Incluye pasos concretos y señales de alarma. Mínimo 10 caracteres.</p>
    </section>
  );
}

function ResolutionChoice({ resolved, setResolved }: { resolved: boolean; setResolved: (value: boolean) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-black text-foreground">Estado después de responder</legend>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${resolved ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25' : 'border-border/50'}`}>
        <input type="radio" name="assistance-state" checked={resolved} onChange={() => setResolved(true)} className="mt-1" />
        <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-bold text-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> Orientación entregada</span><span className="mt-0.5 block text-xs text-muted-foreground">La solicitud sale de la bandeja activa y queda como resuelta.</span></span>
      </label>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${!resolved ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/25' : 'border-border/50'}`}>
        <input type="radio" name="assistance-state" checked={!resolved} onChange={() => setResolved(false)} className="mt-1" />
        <span className="min-w-0"><span className="block text-sm font-bold text-foreground">Requiere seguimiento</span><span className="mt-0.5 block text-xs text-muted-foreground">Envía la respuesta y mantiene el caso asignado en atención.</span></span>
      </label>
    </fieldset>
  );
}

export function VeterinarianResponseDialog({ item, open, onOpenChange, onSubmit }: Props) {
  const [notes, setNotes] = useState('');
  const [resolved, setResolved] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) { setNotes(item?.resolution_notes || ''); setResolved(true); }
  }, [item, open]);
  if (!item) return null;
  const submit = async () => {
    if (notes.trim().length < 10 || saving) return;
    setSaving(true);
    try { await onSubmit(item, notes.trim(), resolved); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-xl">
      <div className="fit-container min-w-0 space-y-5 p-4 sm:p-6">
        <CaseHeader item={item} /><ResponseEditor notes={notes} setNotes={setNotes} /><ResolutionChoice resolved={resolved} setResolved={setResolved} />
        <Button className="w-full" size="lg" disabled={notes.trim().length < 10} loading={saving} onClick={submit}><Send className="mr-2 h-4 w-4" aria-hidden /> Enviar respuesta y notificar</Button>
      </div>
    </DialogContent></Dialog>
  );
}

export default VeterinarianResponseDialog;
