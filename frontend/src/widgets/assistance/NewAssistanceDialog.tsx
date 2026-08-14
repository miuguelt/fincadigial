import React, { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { CATEGORIES, PRIORITY_OPTIONS } from './assistance.constants';
import { BellRing, Camera, Send, ChevronLeft } from 'lucide-react';

type FormData = {
  title: string;
  category: string;
  description: string;
  priority: string;
  photo: File | null;
  photoPreview: string | null;
};

const INITIAL: FormData = {
  title: '', category: '', description: '', priority: 'medium',
  photo: null, photoPreview: null,
};

interface NewAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; category: string; description: string; priority: string }) => Promise<void>;
  recipientCount?: number;
}

export const NewAssistanceDialog = React.memo<NewAssistanceDialogProps>(({ open, onOpenChange, onSave, recipientCount = 0 }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setStep(1); setForm(INITIAL); };

  const handleClose = (open: boolean) => {
    if (!open) { reset(); }
    onOpenChange(open);
  };

  const pickCategory = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value);
    setForm(prev => ({ ...prev, category: value, title: cat ? `Problema de ${cat.label.toLowerCase()}` : '' }));
    setStep(2);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, photo: file, photoPreview: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photo: null, photoPreview: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let desc = form.description;
      if (form.photo && form.photoPreview) {
        desc += `\n\n[Foto adjunta: ${form.photo.name}]`;
      }
      await onSave({
        title: form.title || `Solicitud de ${CATEGORIES.find(c => c.value === form.category)?.label || 'ayuda'}`,
        category: form.category,
        description: desc,
        priority: form.priority,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isStep2Valid = form.description.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-foreground">¿Qué tipo de problema tienes?</h2>
                <p className="text-sm text-muted-foreground">Elige una opción para que podamos ayudarte mejor</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => pickCategory(cat.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 border-border/50 hover:border-primary/50 transition-all text-left ${cat.bg} hover:shadow-md`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <span className="font-medium text-sm text-foreground">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Cuéntanos qué está pasando</h2>
                <p className="text-sm text-muted-foreground">Describí el problema con tus propias palabras</p>
              </div>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Se están poniendo las hojas del maíz amarillas y tienen manchas marrones..."
                className="w-full min-h-[140px] p-4 rounded-xl border border-border/50 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ fontSize: '16px' }}
              />
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  className="hidden"
                  id="photo-input"
                />
                <label
                  htmlFor="photo-input"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer px-4 py-2.5 rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Agregar foto del problema
                </label>
                {form.photoPreview && (
                  <div className="relative">
                    <img src={form.photoPreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-border/50" />
                    <button onClick={removePhoto} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">×</button>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(3)} disabled={!isStep2Valid} size="lg">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">¿Qué tan urgente es?</h2>
                <p className="text-sm text-muted-foreground">Esto nos ayuda a priorizar tu solicitud</p>
              </div>
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(prev => ({ ...prev, priority: opt.value }))}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      form.priority === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-medium text-sm text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {recipientCount > 0
                    ? `Al enviarla avisaremos a ${recipientCount} veterinario${recipientCount === 1 ? '' : 's'} de tu finca.`
                    : 'La solicitud quedará en la bandeja hasta que la finca vincule un veterinario.'}
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSubmit} loading={saving} size="lg">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar solicitud
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

NewAssistanceDialog.displayName = 'NewAssistanceDialog';
