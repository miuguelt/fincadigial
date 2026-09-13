/*
 * CRUDForm
 *
 * Componente optimizado para formularios de creación/edición.
 * Implementa validación eficiente y mejor experiencia de usuario.
 */

import React, { memo, useCallback, useMemo, useEffect, useState } from "react";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Combobox } from "@/shared/ui/combobox";
import { SuggestionChips } from "@/shared/ui/SuggestionChips";
import { cn } from "@/shared/ui/cn";
import { Loader2, ChevronRight } from "lucide-react";
import { useT } from "@/shared/i18n";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import type { FieldErrors } from "@/shared/utils/formValidation";

// Interfaces
import type { CRUDFormField, CRUDFormSection } from "../../../shared/types/crud";

interface CRUDFormProps<T extends { id?: number }> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  formSections: CRUDFormSection<any>[];
  fieldErrors?: FieldErrors;
  onFieldValueChange?: (field: CRUDFormField<any>, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  editingItem?: T | null;
  showEditTimestamps?: boolean;
  additionalFormContent?: (formData: Record<string, any>, editingItem: T | null) => React.ReactNode;
}

// Componente memoizado para cada campo del formulario
const FormField = memo<{
  field: CRUDFormField<any>;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  saving: boolean;
  editingItem?: any;
  dependValue?: any;
}>(({ field, value, onChange, error, saving, editingItem: _editingItem, dependValue }) => {
  const t = useT();
  const [asyncOptions, setAsyncOptions] = useState(field.options);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    setAsyncOptions(field.options);
    if (!field.loadOptions) return;

    let active = true;
    setLoadingOptions(true);
    void field.loadOptions()
      .then((options) => {
        if (active) setAsyncOptions(options);
      })
      .catch(() => {
        if (active) setAsyncOptions([]);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [field]);

  // Variables derivadas frecuentes usadas en diferentes ramas
  const isBirthDateField = String(field.name) === "birth_date";
  const today = getTodayColombia();

  // Determinar si el campo es obligatorio y está vacío
  const isRequired = field.required === true;
  const showWarning = Boolean(error);

  // Manejar cambio de valor
  const handleChange = useCallback((newValue: any) => {
    onChange(newValue);
  }, [onChange]);

  // Opciones filtradas por el campo del que depende el select (tipo de caso, etc.).
  const resolvedOptions = useMemo(() => {
    let opts = asyncOptions || [];
    if (field.optionsFilter && field.dependsOn) {
      opts = field.optionsFilter(dependValue, opts);
    }
    // Preservar la opción seleccionada aunque el filtro la excluya (p. ej. al
    // editar un registro cuyo caso no coincide con el tipo elegido).
    if (value !== undefined && value !== null && value !== "") {
      const selected = (asyncOptions || []).find(
        (o) => String(o.value) === String(value)
      );
      if (selected && !opts.some((o) => String(o.value) === String(value))) {
        opts = [selected, ...opts];
      }
    }
    return opts;
  }, [asyncOptions, dependValue, value, field]);

  // Determinar si el campo está en espera de que se elija el campo padre del que depende
  const isDependentWaiting = Boolean(
    field.dependsOn && (dependValue === undefined || dependValue === null || dependValue === "")
  );

  // Determinar si el campo está deshabilitado
  const isFieldDisabled = Boolean(
    saving || loadingOptions || field.disabled || isDependentWaiting
  );

  const formattedOptions = useMemo(() => {
    return resolvedOptions.map((o) => ({
      label: o.label,
      value: String(o.value),
    }));
  }, [resolvedOptions]);

  // Renderizar campo según tipo
  const renderField = () => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={String(field.name)}
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            disabled={isFieldDisabled}
            aria-invalid={showWarning}
            aria-required={isRequired}
            className={cn(
              "w-full text-sm",
              showWarning
                ? "border-destructive focus:border-destructive ring-1 ring-destructive/30 bg-destructive/[0.03]"
                : "border-border/50 focus:border-primary/50",
              isRequired && "border-l-4 border-l-destructive/40",
              isFieldDisabled && "opacity-60 cursor-not-allowed bg-muted/40",
              "bg-background/50 focus:bg-background/80",
              "transition-all duration-300 backdrop-blur-sm"
            )}
          />
        );

      case "select": {
        const selectPlaceholder = isDependentWaiting
          ? (field.placeholder || "Primero selecciona el campo anterior...")
          : (field.dependsOn && resolvedOptions.length === 0)
          ? (field.emptyMessage || "Sin opciones disponibles")
          : (field.placeholder || t("common.selectOption", "Seleccionar opción"));

        return (
          <div className="relative">
            <select
              id={String(field.name)}
              value={value !== undefined && value !== null ? String(value) : ""}
              onChange={(e) => {
                const val = e.target.value;
                const original = (asyncOptions || []).find((o) => String(o.value) === val);
                handleChange(original ? original.value : (val === "" ? null : val));
              }}
              disabled={isFieldDisabled}
              aria-invalid={showWarning}
              aria-required={isRequired}
              className={cn(
                "w-full min-h-[44px] text-sm rounded-lg border px-3 py-2",
                showWarning
                  ? "border-destructive focus:border-destructive ring-1 ring-destructive/30 bg-destructive/[0.03]"
                  : "border-border/50 focus:border-primary/50",
                isRequired && "border-l-4 border-l-destructive/40",
                isFieldDisabled && "opacity-60 cursor-not-allowed bg-muted/40",
                "bg-background/50 focus:bg-background/80",
                "transition-all duration-300 backdrop-blur-sm"
              )}
            >
              <option value="">{selectPlaceholder}</option>
              {resolvedOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
            {loadingOptions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        );
      }

      case "searchable-select": {
        const comboboxPlaceholder = isDependentWaiting
          ? (field.placeholder || "Primero selecciona el campo anterior...")
          : (field.dependsOn && resolvedOptions.length === 0)
          ? (field.emptyMessage ? "Sin registros asociados (opcional)" : (field.placeholder || "Seleccionar opción"))
          : (field.placeholder || t("common.selectOption", "Seleccionar opción"));

        return (
          <div className="relative">
            <Combobox
              options={formattedOptions}
              value={value !== undefined && value !== null ? String(value) : ""}
              onValueChange={(val: string) => {
                const original = (asyncOptions || []).find((o) => String(o.value) === val);
                handleChange(original ? original.value : val);
              }}
              placeholder={comboboxPlaceholder}
              emptyMessage={field.emptyMessage || t("common.noOptions", "No hay opciones disponibles")}
              disabled={isFieldDisabled}
              className={cn(
                "w-full min-h-[44px] text-sm",
                showWarning
                  ? "border-destructive focus:border-destructive ring-1 ring-destructive/30 bg-destructive/[0.03]"
                  : "border-border/50 focus:border-primary/50",
                isRequired && "border-l-4 border-l-destructive/40",
                isFieldDisabled && "opacity-60 cursor-not-allowed",
                "bg-background/50 focus:bg-background/80",
                "transition-all duration-300 backdrop-blur-sm"
              )}
            />
            {loadingOptions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        );
      }

      case "checkbox":
        return (
          <div className="flex items-center space-x-3 py-1.5 px-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors">
            <input
              id={String(field.name)}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={isFieldDisabled}
              className={cn(
                "h-4 w-4 rounded border-border text-primary",
                "focus:ring-2 focus:ring-primary/20 transition-all",
                "cursor-pointer disabled:cursor-not-allowed"
              )}
            />
            <label
              htmlFor={String(field.name)}
              className="text-xs sm:text-sm font-medium text-foreground cursor-pointer select-none"
            >
              {field.placeholder || field.label}
            </label>
          </div>
        );

      case "number":
        return (
          <Input
            id={String(field.name)}
            type="number"
            value={value !== undefined && value !== null ? value : ""}
            onChange={(e) => {
              const val = e.target.value;
              handleChange(val === "" ? null : Number(val));
            }}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.step}
            disabled={isFieldDisabled}
            aria-invalid={showWarning}
            aria-required={isRequired}
            className={cn(
              "w-full min-h-[44px] text-sm",
              showWarning
                ? "border-destructive focus:border-destructive ring-1 ring-destructive/30 bg-destructive/[0.03]"
                : "border-border/50 focus:border-primary/50",
              isRequired && "border-l-4 border-l-destructive/40",
              isFieldDisabled && "opacity-60 cursor-not-allowed bg-muted/40",
              "bg-background/50 focus:bg-background/80",
              "transition-all duration-300 backdrop-blur-sm"
            )}
          />
        );

      case "date":
        {
          const maxDate = isBirthDateField ? today : undefined;

          return (
            <Input
              id={String(field.name)}
              type="date"
              max={maxDate}
              value={value || ""}
              onChange={(e) => handleChange(e.target.value)}
              disabled={isFieldDisabled}
              aria-invalid={showWarning}
              aria-required={isRequired}
              className={cn(
                "w-full min-h-[44px] text-sm",
                showWarning
                  ? "border-destructive focus:border-destructive ring-1 ring-destructive/30 bg-destructive/[0.03]"
                  : "border-border/50 focus:border-primary/50",
                isRequired && "border-l-4 border-l-destructive/40",
                isFieldDisabled && "opacity-60 cursor-not-allowed bg-muted/40",
                "bg-background/50 focus:bg-background/80",
                "transition-all duration-300 backdrop-blur-sm"
              )}
            />
          );
        }

      case "text":
      case "multiselect":
      default:
        return (
          <Input
            id={String(field.name)}
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={isFieldDisabled}
            aria-invalid={showWarning}
            aria-required={isRequired}
            className={cn(
              "w-full min-h-[44px] text-sm",
              showWarning
                ? "border-destructive focus:border-destructive ring-1 ring-destructive/30 bg-destructive/[0.03]"
                : "border-border/50 focus:border-primary/50",
              isRequired && "border-l-4 border-l-destructive/40",
              isFieldDisabled && "opacity-60 cursor-not-allowed bg-muted/40",
              "bg-background/50 focus:bg-background/80",
              "transition-all duration-300 backdrop-blur-sm"
            )}
          />
        );
    }
  };

  return (
    <div className={cn(
      "w-full space-y-2 group/field relative",
      field.colSpan && field.colSpan > 1 && "sm:col-span-2"
    )}>
      <label htmlFor={String(field.name)} className={cn(
        "block text-xs sm:text-sm font-bold tracking-tight",
        "text-muted-foreground/80 group-focus-within/field:text-primary transition-colors duration-300",
        "flex items-center gap-1.5"
      )}>
        <span>{field.label}</span>
        {isRequired && (
          <span className="text-primary font-black animate-pulse">*</span>
        )}
      </label>

      <div className="relative group/input">
        {renderField()}

        {/* Decorative focus ring/border effect */}
        <div className="absolute inset-0 rounded-xl border-2 border-primary/0 pointer-events-none group-focus-within/input:border-primary/20 transition-all duration-300 -m-[1px]" />
      </div>

      {field.suggestions && field.suggestions.length > 0 && !isFieldDisabled && (
        <SuggestionChips
          suggestions={field.suggestions}
          value={value}
          onSelect={(sugValue) => handleChange(sugValue)}
        />
      )}

      <div className="min-h-[16px] flex flex-col gap-1 overflow-hidden">
        {showWarning && field.type !== "checkbox" && (
          <p className="text-[11px] font-semibold text-destructive flex items-center gap-1.5 mt-1 animate-in slide-in-from-top-1 duration-200">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0 animate-pulse" />
            <span>{error || "Este campo es obligatorio."}</span>
          </p>
        )}

        {field.helperText && !error && (
          <p className="text-[11px] sm:text-[11px] text-muted-foreground/50 italic leading-tight group-focus-within/field:text-muted-foreground/80 transition-colors duration-300">
            {field.helperText}
          </p>
        )}

        {field.type === "date" && isBirthDateField && value && value > today && (
          <p className="text-[11px] font-bold text-destructive animate-in slide-in-from-top-1 duration-300">
            La fecha de nacimiento no puede ser futura.
          </p>
        )}
      </div>
    </div>
  );
});

export function CRUDForm<T extends { id?: number }>({
  isOpen,
  onOpenChange,
  title,
  formData,
  setFormData,
  formSections,
  fieldErrors,
  onFieldValueChange,
  onSubmit,
  saving,
  editingItem,
  showEditTimestamps = true,
  additionalFormContent,
}: CRUDFormProps<T>) {
  const t = useT();
  useEffect(() => {
    if (!isOpen || !fieldErrors) return;
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey || typeof window === "undefined") return;
    const el = document.getElementById(firstKey);
    if (!el || !("focus" in el)) return;
    // No robar el foco mientras la persona está editando: la validación en
    // vivo re-crea fieldErrors en cada pulsación y, si saltáramos al primer
    // campo con error, el usuario no podría terminar de escribir el actual.
    const active = document.activeElement as HTMLElement | null;
    const isEditing = Boolean(
      active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable)
    );
    if (isEditing) return;
    el.scrollIntoView?.({ behavior: "smooth", block: "center" });
    (el as HTMLElement).focus();
  }, [fieldErrors, isOpen]);

  // Manejar cambio de un campo específico
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    const field = formSections
      .flatMap((section) => section.fields)
      .find((item) => String(item.name) === fieldName);
    // Parche declarado por el campo (ej. limpiar un FK excluido al cambiar tipo).
    const patch = field?.onChange ? (field.onChange(value, formData) as Partial<any> | void) : undefined;
    if (onFieldValueChange && field) {
      onFieldValueChange(field, value);
      if (patch) setFormData((prev) => ({ ...prev, ...patch }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
      ...(patch || {}),
    }));
  }, [setFormData, onFieldValueChange, formSections, formData]);

  // Renderizar secciones del formulario
  const renderFormSections = useMemo(() => {
    return formSections.filter((section) => section.showIf?.(formData) !== false).map((section, sectionIndex) => {
      const gridCols = section.gridCols ?? 3;
      const gridClass = `grid grid-cols-1 ${gridCols >= 2 ? "sm:grid-cols-2" : ""} ${gridCols >= 3 ? "lg:grid-cols-3" : ""} gap-3 sm:gap-4 lg:gap-5`;

      return (
        <div key={section.title || sectionIndex} className={cn(
          "relative rounded-xl p-4 sm:p-5",
          "border border-border/40",
          "bg-card shadow-sm",
          "transition-all duration-300 group/section"
        )}>
          {section.title && (
            <div className="mb-4 flex items-center justify-between border-b border-border/30 pb-2">
              <h3 className={cn(
                "text-sm sm:text-base font-semibold leading-none text-foreground flex items-center gap-2",
                "group-focus-within/section:text-primary transition-colors duration-300"
              )}>
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {section.title}
              </h3>
            </div>
          )}

          <div className={gridClass}>
            {section.fields.filter((field) => field.showIf?.(formData) !== false).map((field: any) => (
              <FormField
                key={String(field.name)}
                field={field}
                value={formData[field.name as string]}
                onChange={(value) => handleFieldChange(String(field.name), value)}
                error={fieldErrors?.[String(field.name)]}
                saving={saving}
                editingItem={editingItem}
                dependValue={field.dependsOn ? formData[String(field.dependsOn)] : undefined}
              />
            ))}
          </div>
        </div>
      );
    });
  }, [formSections, formData, saving, editingItem, handleFieldChange, fieldErrors]);

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size="full"
      variant="compact"
      allowFullScreenToggle
      enableBackdropBlur
      preventCloseOnOutsideClick={true}
      className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out"
    >
      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !saving) {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement | null;
            if (submitBtn) {
              submitBtn.click();
            } else {
              onSubmit(e);
            }
          }
        }}
        className="space-y-4 h-full flex flex-col text-[13px] sm:text-sm"
      >
        {/* Los errores de validación ahora se presentan exclusivamente de forma elegante e inline debajo de cada campo */}
        {renderFormSections}
        {additionalFormContent && additionalFormContent(formData, editingItem || null)}

        {editingItem && showEditTimestamps && (
          <div className={cn(
            "mt-2 p-3 sm:p-4 rounded-lg",
            "bg-muted/30 border border-border/40",
            "text-xs sm:text-sm text-muted-foreground",
            "backdrop-blur-sm"
          )}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong className="text-foreground/80">ID:</strong> {editingItem.id}</span>
              {(editingItem as any).created_at && (
                <span><strong className="text-foreground/80">Creado:</strong> {new Date((editingItem as any).created_at).toLocaleDateString("es-CO")}</span>
              )}
              {(editingItem as any).updated_at && (
                <span><strong className="text-foreground/80">Actualizado:</strong> {new Date((editingItem as any).updated_at).toLocaleDateString("es-CO")}</span>
              )}
            </div>
          </div>
        )}

        <div className={cn(
          "flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 mt-6",
          "sticky bottom-0 -mx-3 sm:-mx-4 -mb-2 py-3 px-4 sm:px-5",
          "bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30",
          "border-t border-border/40 z-20"
        )}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
          >
            {t("common.cancel", "Cancelar")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            title={editingItem ? `${t("common.update", "Guardar Cambios")} (Ctrl+Enter)` : `${t("common.create", "Crear Registro")} (Ctrl+Enter)`}
            className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.saving", "Procesando...")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {editingItem ? t("common.update", "Guardar Cambios") : t("common.create", "Crear Registro")}
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </GenericModal>
  );
}

export default CRUDForm;
