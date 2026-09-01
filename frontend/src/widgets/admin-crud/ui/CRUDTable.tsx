/*
 * CRUDTable
 *
 * Componente optimizado para renderizar tablas con gran volumen de datos.
 * Implementa virtualización, memoización y animaciones simplificadas.
 *
 * ── RESPONSIVE ──
 * - Móvil (<768px): cards apiladas verticalmente con kebab menu
 * - Tablet (768px-1023px): tabla con scroll horizontal suave
 * - Escritorio (≥1024px): tabla completa con sticky header
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Eye, Edit, Trash2, Loader2, MoreVertical } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/ui/cn.ts';
import { useT } from '@/shared/i18n';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { FloatingScrollArea } from '@/shared/ui/FloatingScrollArea';
import { isDialogClosingRecently } from '@/shared/utils/modalGuard';
import InlineEditCell from './InlineEditCell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

// Interfaces
import { CRUDColumn, CRUDConfig } from '@/shared/types/crud';
import { buildForeignKeyLabelMap, getCrudItemTitle, mapCrudValue } from './crudTable.helpers';
import { CRUDTableCardView } from './CRUDTableCardView';

// ⚠️ COMPONENTE CRÍTICO - NO ELIMINAR SIN REVISIÓN
// Funciones: [Tabla CRUD con selección masiva, virtualización, responsive cards]
// Última modificación: 2026-05-17
// Relacionado con: AdminCRUDPage, OptimizedAdminCRUDPage

interface CRUDTableProps<T extends { id: number }> {
  items: T[];
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  refreshing?: boolean;
  // Selección masiva
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  onUpdateCell?: (item: T, key: string, value: any) => Promise<void>;
  /**
   * Encabezado de la pantalla (resumen, pestañas…). Se pinta DENTRO del área
   * con scroll para que se desplace junto con las filas: así la tabla puede
   * llegar a ocupar toda la altura disponible en lugar de quedar aplastada
   * bajo un encabezado fijo.
   */
  headerSlot?: React.ReactNode;
}

interface InternalTableProps<T extends { id: number }> {
  items: T[];
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  fkLabelMap: Record<string, Map<string, string>>;
  deletingItems: Set<string>;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  onUpdateCell?: (item: T, key: string, value: any) => Promise<void>;
}

interface TableRowProps<T extends { id: number }> {
  item: T;
  index: number;
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  fkLabelMap: Record<string, Map<string, string>>;
  deletingItems: Set<string>;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onUpdateCell?: (item: T, key: string, value: any) => Promise<void>;
}

// ═══════════════════════════════════════════════════════
// MOBILE CARD COMPONENT — usado en pantallas < 768px
// ═══════════════════════════════════════════════════════
interface MobileCardProps<T extends { id: number }> {
  item: T;
  index: number;
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  fkLabelMap: Record<string, Map<string, string>>;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
}

function MobileCardComponent<T extends { id: number }>(props: MobileCardProps<T>) {
  const { item, index, columns, config, onOpenDetail, onOpenEdit, onOpenDelete, fkLabelMap, selectedIds, onToggleSelect } = props;
  const t = useT();

  const firstCol = columns[0];
  const titleText = getCrudItemTitle(item, config, fkLabelMap);

  const hasActions = Boolean(onOpenDetail || onOpenEdit || onOpenDelete);
  const actionCount = [
    Boolean(onOpenDetail),
    Boolean(onOpenEdit),
    Boolean(onOpenDelete),
  ].filter(Boolean).length;

  // Si hay 3+ acciones, mostrar kebab menu
  const useKebab = actionCount > 2;

  const getCellValue = (col: CRUDColumn<T>) => {
    const raw = (item as any)[col.key];
    if (col.render) return col.render(raw, item, index);
    return mapCrudValue(raw, String(col.key), item, fkLabelMap);
  };

  return (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-lg p-4 shadow-sm",
        "hover:shadow-md hover:border-primary/20 transition-all duration-200",
        "active:scale-[0.99]",
      )}
      onClick={() => {
        if (isDialogClosingRecently()) return;
        onOpenDetail?.(item);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail?.(item);
        }
      }}
      aria-label={`${t('common.view', 'Ver')} ${config.entityName} ${titleText}`}
    >
      {/* ── Título principal ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-bold text-sm text-foreground fit-clamp flex-1" title={titleText}>
          {firstCol && firstCol.render ? getCellValue(firstCol) : titleText}
        </h3>

        <div className="flex items-center gap-2 flex-shrink-0">
          {config.enableSelection && onToggleSelect && (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedIds?.includes(item.id) || false}
                onCheckedChange={() => onToggleSelect(item.id)}
                aria-label={`Seleccionar ${config.entityName} ${item.id}`}
              />
            </div>
          )}
          {/* Badge del segundo campo (usualmente el tipo/evento) */}
          {columns[1] && (
            columns[1].render ? (
              <div className="flex-shrink-0">
                {getCellValue(columns[1])}
              </div>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                {getCellValue(columns[1])}
              </span>
            )
          )}
        </div>
      </div>

      {/* ── Pares clave:valor ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
        {columns.slice(2).map((col) => (
          <div key={String(col.key)} className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {col.label}
            </div>
            <div className="text-xs font-medium text-foreground fit-clamp" title={col.render ? undefined : String((item as any)[col.key] ?? '-')}>
              {getCellValue(col)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Acciones ── */}
      {hasActions && (
        <div
          className="flex items-center gap-2 pt-3 border-t border-border/40"
          onClick={(e) => e.stopPropagation()}
        >
          {useKebab ? (
            <>
              {/* Vista directa en móvil */}
                  {onOpenDetail && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-xl text-xs font-semibold"
                  onClick={() => onOpenDetail?.(item)}
                  aria-label={`${t('common.view', 'Ver')} ${config.entityName} ${item.id}`}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  {t('common.view', 'Ver')}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl flex-shrink-0"
                    aria-label="Más acciones"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  {onOpenEdit && (
                    <DropdownMenuItem onClick={() => onOpenEdit?.(item)} className="py-2.5">
                      <Edit className="h-4 w-4 mr-2 text-warning" />
                      {t('common.edit', 'Editar')}
                    </DropdownMenuItem>
                  )}
                  {onOpenDelete && (
                    <DropdownMenuItem
                      onClick={() => onOpenDelete?.(item.id)}
                      className="py-2.5 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete', 'Eliminar')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {onOpenDetail && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-xl text-xs font-semibold border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white hover:border-sky-500/40 hover:shadow-[0_0_12px_rgba(56,189,248,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  onClick={() => onOpenDetail?.(item)}
                  aria-label={`${t('common.view', 'Ver')} ${config.entityName} ${item.id}`}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  {t('common.view', 'Ver')}
                </Button>
              )}
              {onOpenEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-xl text-xs font-semibold border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  onClick={() => onOpenEdit?.(item)}
                  aria-label={`${t('common.edit', 'Editar')} ${config.entityName} ${item.id}`}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  {t('common.edit', 'Editar')}
                </Button>
              )}
              {onOpenDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-xl text-xs font-semibold border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500/40 hover:shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  onClick={() => onOpenDelete?.(item.id)}
                  aria-label={`${t('common.delete', 'Eliminar')} ${config.entityName} ${item.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t('common.delete', 'Eliminar')}
                </Button>
              )}
            </>
          )}
          {config.customActions && config.customActions(item)}
        </div>
      )}
    </div>
  );
}

const MobileCard = memo(MobileCardComponent) as typeof MobileCardComponent;

// ═══════════════════════════════════════════════════════
// MOBILE CARD LIST — renderiza cards en stack vertical
// ═══════════════════════════════════════════════════════
function MobileCardList<T extends { id: number }>(props: InternalTableProps<T>) {
  const { items, columns, config, onOpenDetail, onOpenEdit, onOpenDelete, fkLabelMap, selectedIds, onToggleSelect } = props;

  return (
    <div className="p-3 space-y-3">
      {items.map((item, index) => (
        <MobileCard
          key={item.id}
          item={item}
          index={index}
          columns={columns}
          config={config}
          onOpenDetail={onOpenDetail}
          onOpenEdit={onOpenEdit}
          onOpenDelete={onOpenDelete}
          fkLabelMap={fkLabelMap}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TABLE ROW — componente memoizado para cada fila
// ═══════════════════════════════════════════════════════
function TableRowComponent<T extends { id: number }>(props: TableRowProps<T>) {
  const {
    item,
    index,
    columns,
    config,
    onOpenDetail,
    onOpenEdit,
    onOpenDelete,
    enhancedHover,
    fkLabelMap,
    deletingItems,
    selectedIds,
    onToggleSelect,
    onUpdateCell,
  } = props;

  const t = useT();
  const isDeleting = deletingItems.has(String(item.id));

  const handleClick = useCallback(() => {
    if (isDialogClosingRecently()) return;
    if (onOpenDetail) {
      onOpenDetail(item);
    }
  }, [onOpenDetail, item]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenEdit) {
      onOpenEdit(item);
    }
  }, [onOpenEdit, item]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDelete) {
      onOpenDelete(item.id);
    }
  }, [onOpenDelete, item]);

  return (
    <tr
      className={cn(
        "h-10 md:h-12 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50",
        "transition-all duration-300 relative overflow-visible",
        enhancedHover
          ? "hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/[0.02] hover:to-transparent"
          : "hover:bg-muted/30",
        isDeleting && "opacity-50 bg-destructive/5 dark:bg-red-950/20"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement | null;
        const isTypingTarget = !!target?.closest(
          'input, textarea, select, [contenteditable="true"]'
        );
        if (isTypingTarget) {
          return;
        }

        if (e.key === 'Enter' || e.key === ' ' || (e as any).keyCode === 13) {
          e.preventDefault();
          if (onOpenDetail) {
            onOpenDetail(item);
          }
        } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
          e.preventDefault();
          const currentTr = e.currentTarget as HTMLElement;
          const nextTr = currentTr.nextElementSibling as HTMLElement | null;
          if (nextTr && (nextTr.tagName === 'TR' || nextTr.getAttribute('role') === 'button')) {
            nextTr.focus();
          }
        } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
          e.preventDefault();
          const currentTr = e.currentTarget as HTMLElement;
          const prevTr = currentTr.previousElementSibling as HTMLElement | null;
          if (prevTr && (prevTr.tagName === 'TR' || prevTr.getAttribute('role') === 'button')) {
            prevTr.focus();
          }
        } else if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (onOpenEdit) {
            onOpenEdit(item);
          }
        } else if (e.key === 'Delete') {
          e.preventDefault();
          if (onOpenDelete) {
            onOpenDelete(item.id);
          }
        }
      }}
      data-item-id={item.id}
    >
      {config.enableSelection && onToggleSelect && (
        <td
          className="px-2 sm:px-3 py-2 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selectedIds?.includes(item.id) || false}
            onCheckedChange={() => onToggleSelect(item.id)}
            aria-label={`Seleccionar ${config.entityName} ${item.id}`}
          />
        </td>
      )}
      {columns.map((col) => (
        <td
          key={String(col.key)}
          className={cn(
            "px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap text-[12px] md:text-sm",
            col.width ? `w-${col.width}` : '',
            "max-w-[320px] xl:max-w-[480px] fit-clamp"
          )}
          title={col.render ? undefined : (fkLabelMap[String(col.key)]?.get(String((item as any)[col.key])) ?? String((item as any)[col.key] ?? ''))}
        >
          {col.editable && onUpdateCell
            ? (
              <InlineEditCell
                value={(item as any)[col.key]}
                editType={col.editType}
                options={
                  col.editOptions ||
                  (config.formSections || [])
                    .flatMap((s) => s.fields || [])
                    .find((f) => String(f.name) === String(col.key))?.options
                }
                onSave={async (newValue) => {
                  if (onUpdateCell) {
                    await onUpdateCell(item, String(col.key), newValue);
                  }
                }}
              />
            )
            : col.render
              ? col.render((item as any)[col.key], item, index)
              : (() => {
                  const raw = (item as any)[col.key];
                  return mapCrudValue(raw, String(col.key), item, fkLabelMap);
                })()}
        </td>
      ))}

      {(onOpenDetail || onOpenEdit || onOpenDelete || config.customActions) && (
        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-xs font-medium"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            {onOpenDetail && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 flex items-center justify-center border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white hover:border-sky-500/40 hover:shadow-[0_0_12px_rgba(56,189,248,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 rounded-xl"
                onClick={handleClick}
                aria-label={`${t('common.view', 'Ver')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onOpenEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 flex items-center justify-center border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 rounded-xl"
                onClick={handleEdit}
                aria-label={`${t('common.edit', 'Editar')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onOpenDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 flex items-center justify-center border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500/40 hover:shadow-[0_0_12px_rgba(244,63,94,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 rounded-xl"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label={`${t('common.delete', 'Eliminar')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {config.customActions && config.customActions(item)}
          </div>
        </td>
      )}
    </tr>
  );
}

const TableRow = memo(TableRowComponent) as typeof TableRowComponent;

// ═══════════════════════════════════════════════════════
// TRADITIONAL TABLE — renderizado desktop/tablet
// ═══════════════════════════════════════════════════════
function TraditionalTableComponent<T extends { id: number }>(props: InternalTableProps<T>) {
  const {
    items,
    columns,
    config,
    onOpenDetail,
    onOpenEdit,
    onOpenDelete,
    enhancedHover,
    fkLabelMap,
    deletingItems,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onUpdateCell,
  } = props;

  const allSelected = items.length > 0 && items.every((item) => selectedIds?.includes(item.id));

  // Calcular el ancho mínimo dinámico según el número total de columnas
  const totalCols = useMemo(() => {
    return columns.length +
      (config.enableSelection ? 1 : 0) +
      ((onOpenDelete || onOpenEdit || onOpenDetail || config.customActions) ? 1 : 0);
  }, [columns.length, config.enableSelection, onOpenDelete, onOpenEdit, onOpenDetail, config.customActions]);

  // `max(100%, …)` y no un ancho fijo: con pocas columnas la tabla se estira
  // hasta llenar la caja (el `min-w-full` de la clase lo pisaba el style en
  // línea y sobraba media pantalla en blanco); con muchas, sigue desbordando y
  // aparece la barra horizontal flotante.
  const minWidthStyle = useMemo(() => {
    return `max(100%, ${Math.max(800, totalCols * 140)}px)`;
  }, [totalCols]);

  return (
    <table
      className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm shadow-sm rounded-lg overflow-hidden"
      style={{ minWidth: minWidthStyle }}
    >
      <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/60 border-b border-border/50">
        <tr className="h-10">
          {config.enableSelection && onToggleSelectAll && (
            <th className="px-2 sm:px-3 py-2 w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Seleccionar todos"
              />
            </th>
          )}
          {columns.map((col) => (
            <th
              key={String(col.key)}
              className={cn(
                "px-2 sm:px-3 py-2 text-left text-[11px] sm:text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                col.width ? `w-${col.width}` : '',
                "fit-clamp"
              )}
            >
              {col.label}
            </th>
          ))}
          {(onOpenDelete || onOpenEdit || onOpenDetail || config.customActions) && (
            <th className="px-1 sm:px-2 py-1 text-left text-[11px] sm:text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="hidden sm:inline">Acciones</span>
              <span className="sm:hidden">Acc.</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60 bg-card">
        {items.map((item, index) => (
          <TableRow
            key={item.id}
            item={item}
            index={index}
            columns={columns}
            config={config}
            onOpenDetail={onOpenDetail}
            onOpenEdit={onOpenEdit}
            onOpenDelete={onOpenDelete}
            enhancedHover={enhancedHover}
            fkLabelMap={fkLabelMap}
            deletingItems={deletingItems}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onUpdateCell={onUpdateCell}
          />
        ))}
      </tbody>
    </table>
  );
}

const TraditionalTable = memo(TraditionalTableComponent) as typeof TraditionalTableComponent;

// ═══════════════════════════════════════════════════════
// CRUD TABLE — orquestador principal (elige vista por breakpoint)
// ═══════════════════════════════════════════════════════
export function CRUDTable<T extends { id: number }>({
  items,
  columns,
  config,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  enhancedHover = false,
  refreshing = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateCell,
  headerSlot,
}: CRUDTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Mapa de etiquetas para llaves foráneas
  const fkLabelMap = useMemo(() => buildForeignKeyLabelMap(config), [config]);

  const deletingItems = useMemo(() => new Set<string>(), []);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col group/table">
      {/* Las barras flotan sobre las filas (`FloatingScrollArea`): no reservan
          pista, así que la tabla usa todo el alto y todo el ancho de la caja, y
          el pulgar sigue a mano en cualquier momento para arrastrarlo.
          El colchón inferior deja pasar la barra de paginación flotante. */}
      <FloatingScrollArea
        containerClassName="flex-1"
        horizontal={!isMobile}
        className={cn(
          "pb-20 md:pb-24",
          refreshing && "opacity-70"
        )}
      >
        {/* El encabezado se desplaza con las filas; `sticky left-0` evita que
            se corra al hacer scroll horizontal de la tabla. */}
        {headerSlot && (
          <div className="sticky left-0 w-full">
            {headerSlot}
          </div>
        )}

        {/* Forzar viewMode cards desde config */}
        {config.viewMode === 'cards' ? (
          <CRUDTableCardView
            items={items}
            columns={columns}
            config={config}
            labels={fkLabelMap}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onOpenDetail={onOpenDetail}
            onOpenEdit={onOpenEdit}
            onOpenDelete={onOpenDelete}
          />
        ) : isMobile ? (
          /* ── MOBILE: Cards apiladas ── */
          <MobileCardList
            items={items}
            columns={columns}
            config={config}
            onOpenDetail={onOpenDetail}
            onOpenEdit={onOpenEdit}
            onOpenDelete={onOpenDelete}
            fkLabelMap={fkLabelMap}
            deletingItems={deletingItems}
            enhancedHover={enhancedHover}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ) : (
          /* ── TABLET/DESKTOP: Tabla tradicional ── */
          <TraditionalTable
            items={items}
            columns={columns}
            config={config}
            onOpenDetail={onOpenDetail}
            onOpenEdit={onOpenEdit}
            onOpenDelete={onOpenDelete}
            enhancedHover={enhancedHover}
            fkLabelMap={fkLabelMap}
            deletingItems={deletingItems}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            onUpdateCell={onUpdateCell}
          />
        )}
      </FloatingScrollArea>
    </div>
  );
}

export default CRUDTable;
