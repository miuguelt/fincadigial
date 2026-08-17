/*
 * CRUDModals
 *
 * Componentes optimizados para los modales de CRUD.
 * Implementa modales de detalle y confirmación con mejor UX.
 */

import React, { memo, useCallback } from 'react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { ConfirmDialog } from '@/shared/ui/common/ConfirmDialog';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { ChevronLeft, ChevronRight, Edit, Calendar, Info } from 'lucide-react';
import { useT } from '@/shared/i18n';

// Interfaces
import { CRUDConfig } from '@/shared/types/crud';

const cardStyles: Record<string, { card: string; header: string; title: string }> = {
  blue: {
    card: "border-blue-100 dark:border-blue-900/30 bg-info/5 dark:bg-blue-950/10",
    header: "border-b border-blue-100/50 dark:border-blue-900/20 bg-info/10 dark:bg-blue-900/20",
    title: "text-info dark:text-blue-300",
  },
  cyan: {
    card: "border-cyan-100 dark:border-cyan-900/30 bg-cyan-500/5 dark:bg-cyan-950/10",
    header: "border-b border-cyan-100/50 dark:border-cyan-900/20 bg-cyan-500/10 dark:bg-cyan-900/20",
    title: "text-cyan-700 dark:text-cyan-300",
  },
  teal: {
    card: "border-teal-100 dark:border-teal-900/30 bg-teal-500/5 dark:bg-teal-950/10",
    header: "border-b border-teal-100/50 dark:border-teal-900/20 bg-teal-500/10 dark:bg-teal-900/20",
    title: "text-teal-700 dark:text-teal-300",
  },
  emerald: {
    card: "border-green-100 dark:border-green-900/30 bg-success/5 dark:bg-green-950/10",
    header: "border-b border-green-100/50 dark:border-green-900/20 bg-success/10 dark:bg-green-900/20",
    title: "text-success dark:text-green-300",
  },
  purple: {
    card: "border-purple-100 dark:border-purple-900/30 bg-purple-50/5 dark:bg-purple-950/10",
    header: "border-b border-purple-100/50 dark:border-purple-900/20 bg-purple-100/10 dark:bg-purple-900/20",
    title: "text-purple-700 dark:text-purple-300",
  },
  indigo: {
    card: "border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/5 dark:bg-indigo-950/10",
    header: "border-b border-indigo-100/50 dark:border-indigo-900/20 bg-indigo-100/10 dark:bg-indigo-900/20",
    title: "text-indigo-700 dark:text-indigo-300",
  },
  red: {
    card: "border-red-100 dark:border-red-900/30 bg-danger/5 dark:bg-red-950/10",
    header: "border-b border-red-100/50 dark:border-red-900/20 bg-danger/10 dark:bg-red-900/20",
    title: "text-danger dark:text-red-300",
  },
  amber: {
    card: "border-amber-100 dark:border-amber-900/30 bg-warning/5 dark:bg-amber-950/10",
    header: "border-b border-amber-100/50 dark:border-amber-900/20 bg-warning/10 dark:bg-warning/20",
    title: "text-warning dark:text-amber-300",
  },
  slate: {
    card: "border-border/60 bg-muted/5 dark:bg-slate-900/10",
    header: "border-b border-border/45 bg-muted/10 dark:bg-slate-900/20",
    title: "text-muted-foreground",
  },
};

// Subcomponente para el modal de detalle
function DetailModalComponent<T extends { id: number }>({
  isOpen,
  onOpenChange,
  title,
  item,
  config,
  onEdit,
  customDetailContent,
  showDetailTimestamps: _showDetailTimestamps = true,
  detailIndex,
  setDetailIndex,
  items,
  setDetailItem,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item: T | null;
  config: CRUDConfig<T, any>;
  onEdit?: (item: T) => void;
  customDetailContent?: (item: T, navigateToItem?: (item: T) => void) => React.ReactNode;
  showDetailTimestamps?: boolean;
  showIdInDetailTitle?: boolean;
  detailIndex: number | null;
  setDetailIndex: (index: number | null) => void;
  items: T[];
  setDetailItem: (item: T | null) => void;
}) {
  const t = useT();

  // Manejar navegación entre elementos
  const handleNextDetail = useCallback(() => {
    if (!items?.length || detailIndex === null) return;
    const nextIndex = (detailIndex + 1) % items.length;
    setDetailIndex(nextIndex);
    setDetailItem(items[nextIndex]);
  }, [items, detailIndex, setDetailIndex, setDetailItem]);

  const handlePrevDetail = useCallback(() => {
    if (!items?.length || detailIndex === null) return;
    const prevIndex = (detailIndex - 1 + items.length) % items.length;
    setDetailIndex(prevIndex);
    setDetailItem(items[prevIndex]);
  }, [items, detailIndex, setDetailIndex, setDetailItem]);

  // Mapa de etiquetas para llaves foráneas
  const fkLabelMap = React.useMemo(() => {
    const map: Record<string, Map<string, string>> = {};
    try {
      (config.formSections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
          if ((field.type === 'select' || field.type === 'searchable-select') && field.options && field.options.length) {
            const m = new Map<string, string>();
            field.options.forEach((opt) => {
              m.set(String(opt.value), opt.label);
            });
            map[String(field.name)] = m;
          }
        });
      });
    } catch (e) {
      console.warn('[DetailModal] Error construyendo mapa de etiquetas', e);
    }
    return map;
  }, [config.formSections]);

  // Footer con navegación y acciones
  const footer = (
    <div className="relative border-t border-border/40 bg-muted/20 backdrop-blur-md px-5 sm:px-6 py-3 sm:py-4 rounded-b-2xl">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex gap-2 sm:flex-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handlePrevDetail}
            disabled={!items || items.length <= 1}
            className="flex-1 sm:flex-initial transition-all duration-300 font-semibold border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary shadow-sm"
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleNextDetail}
            disabled={!items || items.length <= 1}
            className="flex-1 sm:flex-initial transition-all duration-300 font-semibold border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary shadow-sm"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4 sm:ml-1.5" />
          </Button>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => { onOpenChange(false); setDetailIndex(null); }}
            className="flex-1 sm:flex-initial transition-all duration-300 font-semibold border-border/60 hover:bg-muted/50 shadow-sm"
          >
            {t('modal.close', 'Cerrar')}
          </Button>
          {item && onEdit && (
            <Button size="sm"
              type="button"
              onClick={() => { onEdit(item); onOpenChange(false); setDetailIndex(null); }}
              className="flex-1 sm:flex-initial font-bold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Edit className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('common.edit', 'Editar')}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const theme = config.themeColor || 'blue';
  const primaryStyle = cardStyles[theme] || cardStyles.blue;
  const secondaryStyle = cardStyles.slate;

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size="4xl"
      variant="compact"
      allowFullScreenToggle
      enableBackdropBlur
      className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out max-h-[90vh]"
      footer={footer}
      themeColor={theme}
    >
      {item && (
        customDetailContent ? (
          customDetailContent(item, (newItem) => {
            const idx = items.findIndex((i) => i.id === newItem.id);
            if (idx >= 0) {
              setDetailIndex(idx);
              setDetailItem(newItem);
            }
          })
        ) : (
          <div className="grid grid-cols-1 gap-5 p-1">
            <Card className={`shadow-xl hover:shadow-2xl transition-all duration-300 border rounded-lg overflow-hidden ${primaryStyle.card} bg-card/40 backdrop-blur-sm border-border/50`}>
              <CardHeader className={`pb-4 ${primaryStyle.header} bg-muted/10 backdrop-blur-md border-b border-border/40`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-background/50 border border-border/50 shadow-sm ${primaryStyle.title}`}>
                    <Info className="w-4 h-4" />
                  </div>
                  <CardTitle className={`text-sm font-black uppercase tracking-widest ${primaryStyle.title}`}>
                    Información general
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 p-5 sm:p-6 bg-gradient-to-br from-background/40 to-background/10">
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm min-w-0">
                  {config.columns.map((col, _colIndex) => {
                    const rendered = col.render
                      ? col.render((item as any)[col.key], item, 0)
                      : (() => {
                          const raw = (item as any)[col.key];
                          const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                          return mapped ?? String(raw ?? '-');
                        })();

                    if (rendered === null || rendered === undefined) {
                      return null;
                    }

                    return (
                      <div key={String(col.key)} className="rounded-xl border border-border/40 bg-muted/5 p-4 transition-all duration-300 hover:bg-muted/20 hover:border-border/80 space-y-1.5 min-w-0 shadow-sm hover:shadow-md group">
                        <dt className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                          {col.label}
                        </dt>
                        <dd className="text-sm sm:text-base font-semibold text-foreground break-words whitespace-normal leading-snug min-w-0">
                          {rendered}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>

            <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 border rounded-lg overflow-hidden ${secondaryStyle.card} bg-card/30 backdrop-blur-sm border-border/40`}>
              <CardHeader className={`pb-4 ${secondaryStyle.header} bg-muted/5 backdrop-blur-md border-b border-border/30`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-background/50 border border-border/50 shadow-sm ${secondaryStyle.title}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <CardTitle className={`text-sm font-black uppercase tracking-widest ${secondaryStyle.title}`}>
                    Fecha y hora
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 p-5 sm:p-6 bg-gradient-to-br from-background/30 to-background/5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {(item as any).created_at && (
                    <div className="rounded-xl border border-border/40 bg-muted/5 p-4 transition-all duration-300 hover:bg-muted/20 hover:border-border/80 space-y-1.5 min-w-0 shadow-sm hover:shadow-md group">
                      <dt className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                        Creado
                      </dt>
                      <dd className="text-sm sm:text-base font-semibold text-foreground break-words whitespace-normal leading-snug">
                        {new Date((item as any).created_at).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </dd>
                    </div>
                  )}
                  {(item as any).updated_at && (
                    <div className="rounded-xl border border-border/40 bg-muted/5 p-4 transition-all duration-300 hover:bg-muted/20 hover:border-border/80 space-y-1.5 min-w-0 shadow-sm hover:shadow-md group">
                      <dt className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                        Actualizado
                      </dt>
                      <dd className="text-sm sm:text-base font-semibold text-foreground break-words whitespace-normal leading-snug">
                        {new Date((item as any).updated_at).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </GenericModal>
  );
}

export const DetailModal = DetailModalComponent;

// Subcomponente para el diálogo de confirmación de eliminación
export const ConfirmDeleteDialog = memo<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  entityName: string;
  loadingDependencies?: boolean;
  dependencyInfo?: {
    hasDependencies: boolean;
    canDelete: boolean;
    totalDependencies: number;
    message: string;
    dependencies: Array<{
      table: string;
      count: number;
      field: string;
      cascade_delete: boolean;
      message: string;
      samples?: Array<{ id: number | string; name: string }>;
    }>;
  } | null;
}>(({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
  loadingDependencies = false,
  dependencyInfo = null,
}) => {
  // Construir mensaje detallado de advertencia o cascada si aplica
  const detailedMessage = React.useMemo(() => {
    if (loadingDependencies) {
      return "Buscando registros relacionados en la base de datos...\nPor favor espere.";
    }
    if (dependencyInfo && dependencyInfo.hasDependencies) {
      let msg = "**Atención: Registros asociados encontrados**\n\n";
      dependencyInfo.dependencies.forEach((dep) => {
        const typeStr = dep.cascade_delete ? "🔄 Se eliminará en cascada" : "❌ Bloquea la eliminación";
        msg += `• **${dep.message || dep.table}** (${typeStr})\n`;

        // Listar las muestras si existen
        if (dep.samples && dep.samples.length > 0) {
          dep.samples.forEach((sample) => {
            msg += `    - ${sample.name} (ID: ${sample.id})\n`;
          });
          if (dep.count > dep.samples.length) {
            msg += `    - ... y ${dep.count - dep.samples.length} más\n`;
          }
        }
      });

      if (!dependencyInfo.canDelete) {
        msg += "\n**Acción Requerida:**\nNo se puede eliminar esta entidad porque tiene dependencias activas. Debes reasignar o eliminar estos registros asociados primero.";
      } else {
        msg += "\n**Nota:**\nAl confirmar la eliminación, todos los registros relacionados se eliminarán de forma automática (cascada).";
      }
      return msg;
    }
    return undefined;
  }, [loadingDependencies, dependencyInfo]);

  const showWarningIcon = !!(dependencyInfo && dependencyInfo.hasDependencies);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      confirmVariant="destructive"
      size="sm"
      detailedMessage={detailedMessage}
      showWarningIcon={showWarningIcon}
    />
  );
});

ConfirmDeleteDialog.displayName = 'ConfirmDeleteDialog';
