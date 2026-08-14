import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';

interface InlineEditCellProps {
  value: any;
  editType?: 'text' | 'number' | 'select';
  options?: Array<{ label: string; value: string | number }>;
  onSave: (newValue: any) => Promise<void>;
  className?: string;
}

export function InlineEditCell({
  value,
  editType = 'text',
  options = [],
  onSave,
  className = '',
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && editType !== 'select') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, editType]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Si el valor no cambió, salir de edición
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    // Validaciones básicas de cliente
    if (editType === 'number') {
      const numVal = Number(currentValue);
      if (Number.isNaN(numVal) || numVal < 0) {
        showToast('⚠️ Por favor ingrese un número válido y positivo', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      // Cast the value if number
      const parsedValue = editType === 'number' ? Number(currentValue) : currentValue;
      await onSave(parsedValue);
      setIsEditing(false);
    } catch (error: any) {
      // Revertir valor
      setCurrentValue(value);
      showToast(
        `❌ Error al actualizar: ${error?.response?.data?.message || error?.message || 'Error del servidor'}`,
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div 
        className="flex items-center gap-1 w-full min-w-[120px]"
        onClick={(e) => e.stopPropagation()}
      >
        {editType === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={currentValue ?? ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="flex-1 px-2 py-1 text-xs rounded-lg border border-primary/50 bg-background text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition duration-150"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={editType === 'number' ? 'number' : 'text'}
            value={currentValue ?? ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="flex-1 px-2 py-1 text-xs rounded-lg border border-primary/50 bg-background text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition duration-150"
          />
        )}
        
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />
        ) : (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleSave}
              className="p-1 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-md transition duration-150"
              title="Guardar"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded-md transition duration-150"
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Encontrar etiqueta si es tipo select
  let displayValue = currentValue;
  if (editType === 'select') {
    const matchedOption = options.find((opt) => String(opt.value) === String(currentValue));
    if (matchedOption) displayValue = matchedOption.label;
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`group relative flex items-center justify-between cursor-pointer hover:bg-primary/5 px-2 py-1 rounded-lg transition duration-200 border border-transparent hover:border-border/30 ${className}`}
      title="Doble clic para editar"
    >
      <span className="fit-clamp pr-4">{displayValue ?? '-'}</span>
      <Edit2 className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition duration-200 absolute right-2 opacity-0 group-hover:opacity-100 flex-shrink-0" />
    </div>
  );
}

export default InlineEditCell;
