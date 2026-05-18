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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

// Interfaces
import { CRUDColumn, CRUDConfig } from '@/shared/types/crud';

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
  const rawTitle = firstCol ? (item as any)[firstCol.key] : null;
  const mappedTitle = firstCol ? fkLabelMap[String(firstCol.key)]?.get(String(rawTitle)) : null;
  const titleText = mappedTitle ?? String(rawTitle ?? `${config.entityName} #${item.id}`);

  const hasActions = config.enableDetailModal !== false || config.enableEditModal !== false || config.enableDelete;
  const actionCount = [
    config.enableDetailModal !== false,
    config.enableEditModal !== false,
    config.enableDelete,
  ].filter(Boolean).length;

  // Si hay 3+ acciones, mostrar kebab menu
  const useKebab = actionCount > 2;

  const getCellValue = (col: CRUDColumn<T>) => {
    const raw = (item as any)[col.key];
    if (col.render) return col.render(raw, item, index);
    const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
    return mapped ?? String(raw ?? '-');
  };

  return (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-2xl p-4 shadow-sm",
        "hover:shadow-md hover:border-primary/20 transition-all duration-200",
        "active:scale-[0.99]",
      )}
      onClick={() => onOpenDetail?.(item)}
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
        <h3 className="font-bold text-sm text-foreground truncate flex-1" title={titleText}>
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
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
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
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {col.label}
            </div>
            <div className="text-xs font-medium text-foreground truncate" title={col.render ? undefined : String((item as any)[col.key] ?? '-')}>
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
              {config.enableDetailModal !== false && (
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
                  {config.enableEditModal !== false && (
                    <DropdownMenuItem onClick={() => onOpenEdit?.(item)} className="py-2.5">
                      <Edit className="h-4 w-4 mr-2 text-amber-600" />
                      {t('common.edit', 'Editar')}
                    </DropdownMenuItem>
                  )}
                  {config.enableDelete && (
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
              {config.enableDetailModal !== false && (
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
              {config.enableEditModal !== false && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-xl text-xs font-semibold"
                  onClick={() => onOpenEdit?.(item)}
                  aria-label={`${t('common.edit', 'Editar')} ${config.entityName} ${item.id}`}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  {t('common.edit', 'Editar')}
                </Button>
              )}
              {config.enableDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
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
  } = props;

  const t = useT();
  const isDeleting = deletingItems.has(String(item.id));
  
  const handleClick = useCallback(() => {
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
        enhancedHover ? "hover:bg-muted/40" : "hover:bg-muted/40",
        isDeleting && "opacity-50 bg-red-50 dark:bg-red-950/20"
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
            "px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-sm",
            col.width ? `w-${col.width}` : '',
            "truncate max-w-[120px] sm:max-w-[180px] md:max-w-[240px]"
          )}
          title={col.render ? undefined : (fkLabelMap[String(col.key)]?.get(String((item as any)[col.key])) ?? String((item as any)[col.key] ?? ''))}
        >
          {col.render
            ? col.render((item as any)[col.key], item, index)
            : (() => {
                const raw = (item as any)[col.key];
                const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                return mapped ?? String(raw ?? '-');
              })()}
        </td>
      ))}
      
      {(config.enableDetailModal !== false || config.enableEditModal !== false || config.enableDelete || config.customActions) && (
        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-xs font-medium" 
            onClick={(e) => e.stopPropagation()} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            {config.enableDetailModal !== false && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 rounded-lg"
                onClick={handleClick}
                aria-label={`${t('common.view', 'Ver')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {config.enableEditModal !== false && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200 rounded-lg"
                onClick={handleEdit}
                aria-label={`${t('common.edit', 'Editar')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {config.enableDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 rounded-lg"
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
  } = props;

  const allSelected = items.length > 0 && items.every((item) => selectedIds?.includes(item.id));

  return (
    <table className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm shadow-sm rounded-lg overflow-hidden">
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
                "px-2 sm:px-3 py-2 text-left text-[10px] sm:text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                col.width ? `w-${col.width}` : '',
                "truncate"
              )}
            >
              {col.label}
            </th>
          ))}
          {(config.enableDelete || config.customActions) && (
            <th className="px-1 sm:px-2 py-1 text-left text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
}: CRUDTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Mapa de etiquetas para llaves foráneas
  const fkLabelMap = useMemo(() => {
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
      console.warn('[CRUDTable] Error construyendo mapa de etiquetas', e);
    }
    return map;
  }, [config.formSections]);
  
  const deletingItems = useMemo(() => new Set<string>(), []);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col group/table">
      {/* Indicador visual de scroll lateral (solo tablet+) */}
      {!isMobile && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-10 opacity-0 group-hover/table:opacity-100 transition-opacity hidden md:block" />
      )}
      
      <div className={cn(
        "flex-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        isMobile ? "overflow-y-auto" : "overflow-x-auto overflow-y-auto",
        refreshing && "opacity-70"
      )}>
        {/* Forzar viewMode cards desde config */}
        {config.viewMode === 'cards' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
              const firstCol = columns[0];
              const rawTitle = (item as any)[firstCol?.key];
              const mappedTitle = fkLabelMap[String(firstCol?.key)]?.get(String(rawTitle));
              const titleText = mappedTitle ?? String(rawTitle ?? `${config.entityName} #${item.id}`);
              
              return (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer relative"
                  onClick={() => onOpenDetail?.(item)}
                >
                  {config.enableSelection && onToggleSelect && (
                    <div
                      className="absolute top-2 right-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds?.includes(item.id) || false}
                        onCheckedChange={() => onToggleSelect(item.id)}
                        aria-label={`Seleccionar ${config.entityName} ${item.id}`}
                      />
                    </div>
                  )}
                  <h3 className="font-medium text-sm mb-2 truncate">{titleText}</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {columns.slice(1, 3).map((col) => {
                      const raw = (item as any)[col.key];
                      const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                      return (
                        <div key={String(col.key)}>
                          <span className="font-medium">{col.label}:</span>{' '}
                          <span>{mapped ?? String(raw ?? '-')}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    {config.enableDetailModal !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail?.(item);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {config.enableEditModal !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEdit?.(item);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {config.enableDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDelete?.(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
          />
        )}
      </div>
    </div>
  );
}

export default CRUDTable;
