import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  Calendar,
  Layers,
  Scale,
  Leaf,
} from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  COLOMBIAN_FORAGE_PRESETS,
} from '@/entities/food-type/model/forageClassification';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { FoodTypeResponse } from '@/shared/api/generated/swaggerTypes';

export type FoodTypeFormData = {
  food_type: string;
  handlings: string;
  sowing_date?: string;
  harvest_date?: string;
  area?: number;
  gauges?: string;
};

interface FoodTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: (FoodTypeResponse & { [k: string]: any }) | null;
  onSubmit: (data: FoodTypeFormData) => Promise<void>;
  loading?: boolean;
}

export const FoodTypeFormModal: React.FC<FoodTypeFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  loading = false,
}) => {
  const isEditing = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState<FoodTypeFormData>({
    food_type: '',
    handlings: '',
    sowing_date: getTodayColombia(),
    harvest_date: '',
    area: 1,
    gauges: '',
  });

  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        food_type: initialData.food_type || initialData.name || '',
        handlings: initialData.handlings || initialData.description || '',
        sowing_date: initialData.sowing_date || getTodayColombia(),
        harvest_date: initialData.harvest_date || '',
        area: initialData.area !== undefined && initialData.area !== null ? Number(initialData.area) : 1,
        gauges: initialData.gauges || '',
      });
      setSelectedPreset('');
    } else {
      setFormData({
        food_type: '',
        handlings: '',
        sowing_date: getTodayColombia(),
        harvest_date: '',
        area: 1,
        gauges: '',
      });
      setSelectedPreset('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleApplyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = COLOMBIAN_FORAGE_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    setFormData((prev) => ({
      ...prev,
      food_type: preset.name,
      handlings: preset.handlings,
      gauges: preset.gauges,
      area: preset.areaDefault || prev.area || 1,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.food_type || !formData.food_type.trim()) {
      newErrors.food_type = 'El nombre del alimento o pastura es obligatorio.';
    }
    if (formData.area !== undefined && formData.area <= 0) {
      newErrors.area = 'El área debe ser mayor a 0.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      ...formData,
      food_type: formData.food_type.trim(),
      handlings: formData.handlings?.trim() || 'Manejo estándar según condiciones de la finca.',
      gauges: formData.gauges?.trim() || 'Aforo y composición nutricional estándar.',
      area: formData.area ? Number(formData.area) : 1,
    });
  };

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Editar Tipo de Alimento / Forraje' : 'Registrar Nuevo Forraje o Alimento'}
      subtitle={isEditing ? `Actualizando: ${formData.food_type}` : 'Catálogo nutricional y praderas de la finca'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Preset Selector for New Item */}
        {!isEditing && (
          <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-1.5">
            <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Plantillas Rápidas de Forrajes en Colombia (Opcional)
            </Label>
            <select
              value={selectedPreset}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">Seleccionar plantilla (Kikuyo, Brachiarias, Mombaza, Botón de Oro, etc.)...</option>
              {COLOMBIAN_FORAGE_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} • {p.proteinRange}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nombre del forraje */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground">
            Nombre del Alimento o Forraje <span className="text-destructive">*</span>
          </Label>
          <Input
            value={formData.food_type}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, food_type: e.target.value }));
              if (errors.food_type) setErrors((prev) => ({ ...prev, food_type: '' }));
            }}
            placeholder="Ej: Pasto Brachiaria brizantha (Toledo), Silo de Maíz, Sal 8%..."
            className="h-10 text-sm font-medium"
            required
          />
          {errors.food_type && <p className="text-xs text-destructive font-medium">{errors.food_type}</p>}
        </div>

        {/* Parámetros de Extensión y Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <Layers className="w-3 h-3 text-muted-foreground" />
              Área Sembrada (ha)
            </Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={formData.area || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, area: e.target.value ? parseFloat(e.target.value) : undefined }))
              }
              placeholder="Ej: 5.0"
              className="h-9 text-sm"
            />
            {errors.area && <p className="text-xs text-destructive font-medium">{errors.area}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              Fecha de Siembra
            </Label>
            <Input
              type="date"
              value={formData.sowing_date || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, sowing_date: e.target.value }))}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              Fecha Cosecha (Opcional)
            </Label>
            <Input
              type="date"
              value={formData.harvest_date || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, harvest_date: e.target.value }))}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Manejos agronómicos */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-500" />
            Manejo Agronómico / Instrucciones de Suministro
          </Label>
          <Textarea
            value={formData.handlings}
            onChange={(e) => setFormData((prev) => ({ ...prev, handlings: e.target.value }))}
            placeholder="Días de descanso requeridos, fertilización nitrogenada, rotación de potreros o dosis diaria..."
            rows={2}
            className="text-xs leading-relaxed"
          />
        </div>

        {/* Aforo y mediciones */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            Aforos, Calibres y Calidad Bromatológica
          </Label>
          <Textarea
            value={formData.gauges}
            onChange={(e) => setFormData((prev) => ({ ...prev, gauges: e.target.value }))}
            placeholder="Aforo esperado (kg/m²), porcentaje de proteína bruta (% PB), materia seca (% MS)..."
            rows={2}
            className="text-xs leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Forraje'}
          </Button>
        </div>
      </form>
    </GenericModal>
  );
};
export default FoodTypeFormModal;