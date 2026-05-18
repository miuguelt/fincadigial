import React, { useState } from 'react';
import { 
  Milk, 
  Weight, 
  Stethoscope, 
  Heart, 
  Plus, 
  X, 
  Check, 
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/app/providers/ToastContext';
import { milkService } from '@/entities/milk/api/milk.service';
import { controlService } from '@/entities/control/api/control.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/ui/cn.ts';

export default function QuickActionCards() {
  const { showToast } = useToast();
  const { animals } = useAnimals({ limit: 100 });
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const actions = [
    { 
      id: 'milk', 
      title: 'Leche', 
      subtitle: 'Registrar ordeño',
      icon: <Milk className="h-6 w-6" />, 
      color: 'from-blue-500 to-blue-700', 
      shadow: 'shadow-blue-500/20' 
    },
    { 
      id: 'weight', 
      title: 'Peso', 
      subtitle: 'Control de masa',
      icon: <Weight className="h-6 w-6" />, 
      color: 'from-orange-500 to-orange-700', 
      shadow: 'shadow-orange-500/20' 
    },
    { 
      id: 'health', 
      title: 'Salud', 
      subtitle: 'Nuevo tratamiento',
      icon: <Stethoscope className="h-6 w-6" />, 
      color: 'from-rose-500 to-rose-700', 
      shadow: 'shadow-rose-500/20' 
    },
    { 
      id: 'repro', 
      title: 'Celo', 
      subtitle: 'Reportar evento',
      icon: <Heart className="h-6 w-6" />, 
      color: 'from-pink-500 to-pink-700', 
      shadow: 'shadow-pink-500/20' 
    },
  ];

  const handleAction = (id: string) => {
    setFormData({ date: new Date().toISOString().split('T')[0] });
    setActiveModal(id);
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeModal === 'milk') {
        await milkService.create({
          animal_id: parseInt(formData.animal_id),
          liters: parseFloat(formData.liters),
          session: formData.session || 'AM',
          date: formData.date,
          notes: formData.notes
        } as any);
      } else if (activeModal === 'weight') {
        await controlService.create({
          animal_id: parseInt(formData.animal_id),
          weight: parseInt(formData.weight),
          checkup_date: formData.date,
          observations: formData.notes
        } as any);
      } else if (activeModal === 'health') {
        await treatmentsService.create({
          animal_id: parseInt(formData.animal_id),
          treatment_date: formData.date,
          description: formData.notes || 'Tratamiento general',
          status: 'En curso'
        } as any);
      } else if (activeModal === 'repro') {
        await reproductionService.create({
          animal_id: parseInt(formData.animal_id),
          event_type: 'Celo',
          event_date: formData.date,
          notes: formData.notes
        } as any);
      }
      
      showToast('Registro guardado con éxito', 'success');
      closeModal();
    } catch (error: any) {
      showToast(error.message || 'Error al guardar registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {actions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.02, translateY: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAction(action.id)}
          className={cn(
            "relative flex items-center gap-4 p-5 rounded-[2rem] border border-white/10 overflow-hidden text-left group transition-all",
            "bg-gradient-to-br bg-card/40 backdrop-blur-xl shadow-xl",
            action.shadow
          )}
        >
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg text-white shrink-0 group-hover:rotate-12 transition-transform",
            action.color
          )}>
            {action.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg tracking-tighter leading-tight">{action.title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{action.subtitle}</p>
          </div>
          <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          
          {/* Decorative highlight */}
          <div className="absolute top-0 right-0 h-20 w-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
        </motion.button>
      ))}

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ y: '100%', scale: 1 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-card/95 backdrop-blur-2xl w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl border-t sm:border border-white/10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="relative p-8 border-b border-white/5 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                      actions.find(a => a.id === activeModal)?.color
                    )}>
                      {actions.find(a => a.id === activeModal)?.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter">
                        {actions.find(a => a.id === activeModal)?.title}
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Acción Rápida de Campo</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={closeModal}
                    className="rounded-full bg-white/5 hover:bg-white/10"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              
              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Sujeto / Animal</Label>
                  <div className="relative">
                    <select
                      id="animal_id"
                      className="w-full h-14 rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm px-4 py-2 text-sm font-bold appearance-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      value={formData.animal_id || ''}
                      onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })}
                      required
                    >
                      <option value="">Buscar en el hato...</option>
                      {animals?.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.record} - {a.alias || ''}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <ChevronRight className="h-5 w-5 rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      className="h-14 rounded-2xl border border-white/10 bg-background/50 font-bold"
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  
                  {activeModal === 'milk' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Sesión</Label>
                      <select
                        id="session"
                        className="w-full h-14 rounded-2xl border border-white/10 bg-background/50 px-4 font-bold outline-none"
                        value={formData.session || 'AM'}
                        onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                      >
                        <option value="AM">Mañana</option>
                        <option value="PM">Tarde</option>
                      </select>
                    </div>
                  )}
                </div>

                {activeModal === 'milk' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-blue-500">Volumen (Litros)</Label>
                    <div className="relative">
                      <Input
                        id="liters"
                        type="number"
                        step="0.1"
                        className="h-14 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-xl font-black text-center"
                        placeholder="0.0"
                        value={formData.liters || ''}
                        onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                        required
                      />
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500/50" />
                    </div>
                  </div>
                )}

                {activeModal === 'weight' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-orange-500">Masa Corporal (Kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      className="h-14 rounded-2xl border border-orange-500/20 bg-orange-500/5 text-xl font-black text-center"
                      placeholder="0"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Notas del Operario</Label>
                  <textarea
                    id="notes"
                    placeholder="Escribe observaciones adicionales..."
                    className="w-full min-h-[100px] rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-14 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] border-white/10"
                    onClick={closeModal}
                  >
                    Descartar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-14 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] bg-primary shadow-xl shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
