import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CircleAlert, GripVertical, MapPin, RefreshCw, Search, Sprout } from 'lucide-react';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/ui/cn';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { roleCan } from '@/shared/lib/rbac';
import { MoveAnimalsDialog } from './MoveAnimalsDialog';
import { AnimalChip } from './AnimalChip';
import { PotreroColumn } from './PotreroColumn';
import { BoardNotice, BoardTotalsGrid, UndoBar } from './BoardSummary';
import { SemaforoPotrerosCard } from './SemaforoPotrerosCard';
import { UNASSIGNED_COLUMN, useBoardDragDrop, type ColumnKey } from '../model/useBoardDragDrop';
import { MAX_BOARD_ANIMALS, usePotrerosBoard, type BoardAnimal } from '../model/usePotrerosBoard';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';

interface PotrerosBoardPageProps {
  /** Botones para volver a tabla/tarjetas; se muestran en la cabecera. */
  viewSwitcher?: React.ReactNode;
}

const BoardShell: React.FC<{ header: React.ReactNode; children: React.ReactNode }> = ({ header, children }) => (
  <AppLayout header={header} className="max-w-full pb-28" contentClassName="space-y-4">
    {children}
  </AppLayout>
);

/**
 * Tablero de rotación en potreros.
 *
 * Carga su propio inventario (todos los animales vivos) en lugar de heredar la
 * página del CRUD: la vista agrupa por potrero y con 25 registros por página
 * los conteos y la ocupación no correspondían con la realidad.
 */
export function PotrerosBoardPage({ viewSwitcher }: PotrerosBoardPageProps) {
  const { goTo } = useRoleNavigation();
  const { showToast } = useToast();
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const { role, user } = useAuth() as any;
  const currentRole = normalizeRole(role || user?.role) || String(role || user?.role || '');
  const canMove = roleCan(currentRole, 'animal-fields', 'create');

  const board = usePotrerosBoard();
  const { fields, grouped, totals, loading, error, truncated, saving, lastUndo } = board;

  const [query, setQuery] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<ColumnKey>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [showSemaforo, setShowSemaforo] = useState(false);

  const term = query.trim().toLowerCase();
  const matches = useCallback(
    (animal: BoardAnimal) => !term || animal.record.toLowerCase().includes(term),
    [term],
  );

  const visibleUnassigned = useMemo(() => grouped.unassigned.filter(matches), [grouped.unassigned, matches]);
  const visibleByField = useMemo(() => {
    const map = new Map<number, BoardAnimal[]>();
    grouped.groups.forEach((items, fieldId) => map.set(fieldId, items.filter(matches)));
    return map;
  }, [grouped.groups, matches]);

  const countByField = useMemo(() => {
    const map = new Map<number, number>();
    grouped.groups.forEach((items, fieldId) => map.set(fieldId, items.length));
    return map;
  }, [grouped.groups]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleAnimal = useCallback((animalId: number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(animalId)) next.delete(animalId);
      else next.add(animalId);
      return next;
    });
  }, []);

  const toggleColumnSelection = useCallback((animals: BoardAnimal[]) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allSelected = animals.every((animal) => next.has(animal.id));
      animals.forEach((animal) => (allSelected ? next.delete(animal.id) : next.add(animal.id)));
      return next;
    });
  }, []);

  const toggleCollapse = useCallback((key: ColumnKey) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const runMove = useCallback(
    async (animalIds: number[], targetFieldId: number | null) => {
      const result = await board.moveAnimals(animalIds, targetFieldId);
      showToast(result.message, result.tone);
      if (result.ok) clearSelection();
    },
    [board, clearSelection, showToast],
  );

  const handleDrop = useCallback(
    (animalId: number, target: ColumnKey) => {
      // Arrastrar un animal ya seleccionado mueve el lote completo.
      const ids = selectedIds.has(animalId) ? Array.from(selectedIds) : [animalId];
      void runMove(ids, target === UNASSIGNED_COLUMN ? null : target);
    },
    [runMove, selectedIds],
  );

  const drag = useBoardDragDrop({ enabled: canMove && !saving, onDrop: handleDrop });

  const openAnimal = useCallback(
    (animal: BoardAnimal) => {
      if (drag.consumeClickAfterDrag()) return;
      setSelectedAnimalId(animal.id);
    },
    [drag],
  );

  const header = (
    <PageHeader
      title="Potreros"
      description="Mira dónde está cada animal y muévelo de potrero."
      actions={(
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {viewSwitcher}
          <Button
            variant="outline"
            size="sm"
            className="h-11 flex-1 sm:flex-none"
            onClick={() => void board.reload()}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      )}
    />
  );

  if (loading) {
    return (
      <BoardShell header={header}>
        <div className="flex flex-col items-center justify-center py-24" aria-live="polite">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-base font-bold text-foreground">Cargando el ganado y los potreros…</p>
          <p className="mt-1 text-sm text-muted-foreground">Un momento, estamos ubicando cada animal.</p>
        </div>
      </BoardShell>
    );
  }

  if (error) {
    return (
      <BoardShell header={header}>
        <div className="mx-auto max-w-xl rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <p className="text-base font-bold text-foreground">No se pudo cargar el tablero</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4 h-12" onClick={() => void board.reload()}>
            Intentar de nuevo
          </Button>
        </div>
      </BoardShell>
    );
  }

  const renderAnimals = (animals: BoardAnimal[]) =>
    animals.map((animal) => (
      <AnimalChip
        key={animal.id}
        animal={animal}
        selected={selectedIds.has(animal.id)}
        selectable={canMove}
        draggable={drag.active}
        dragging={drag.draggingId === animal.id}
        onToggle={toggleAnimal}
        onOpen={openAnimal}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
    ));

  const selectedCount = selectedIds.size;
  // Si todo el lote sale del mismo potrero, ese potrero no se ofrece como destino.
  const selectedOrigins = new Set(
    board.animals.filter((animal) => selectedIds.has(animal.id)).map((animal) => animal.fieldId),
  );
  const commonOrigin = selectedOrigins.size === 1 ? [...selectedOrigins][0] : null;

  return (
    <BoardShell header={header}>
      <BoardTotalsGrid totals={totals} />

      {truncated && (
        <BoardNotice>
          El tablero muestra los primeros {MAX_BOARD_ANIMALS} animales vivos. Usa el buscador o la vista de tabla
          para el resto.
        </BoardNotice>
      )}

      {lastUndo && (
        <UndoBar
          undo={lastUndo}
          busy={saving}
          onUndo={() => void board.undoLastMove().then((r) => showToast(r.message, r.tone))}
          onDismiss={board.dismissUndo}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar animal por número"
            className="h-12 pl-11 text-base"
            aria-label="Buscar animal por número de registro"
          />
        </div>
        <Button
          variant={onlyUnassigned ? 'primary' : 'outline'}
          className="h-12 justify-center"
          onClick={() => setOnlyUnassigned((value) => !value)}
          aria-pressed={onlyUnassigned}
        >
          <CircleAlert className="mr-2 h-5 w-5" />
          Solo sin potrero ({totals.unassigned})
        </Button>
        <Button
          variant={showSemaforo ? 'primary' : 'outline'}
          className="h-12 justify-center"
          onClick={() => setShowSemaforo((v) => !v)}
          aria-pressed={showSemaforo}
        >
          <Sprout className="mr-2 h-5 w-5" />
          Semáforo Forrajero
        </Button>
      </div>

      {showSemaforo && (
        <div className="animate-in fade-in-50 duration-300">
          <SemaforoPotrerosCard showTitle={false} />
        </div>
      )}

      {drag.active && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          Marca los animales y usa “Mover”, o arrástralos con el mouse hasta el potrero.
        </p>
      )}

      {fields.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-base font-bold text-foreground">Todavía no hay potreros registrados</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea el primer potrero para empezar a ubicar el ganado.</p>
          <Button className="mt-4 h-12" onClick={() => goTo('/admin/fields')}>
            Ir a potreros
          </Button>
        </div>
      )}

      <div
        className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerUp}
      >
        {(totals.unassigned > 0 || onlyUnassigned) && (
          <PotreroColumn
            columnKey={UNASSIGNED_COLUMN}
            label="Sin potrero asignado"
            animals={visibleUnassigned}
            total={totals.unassigned}
            isUnassigned
            collapsed={collapsed.has(UNASSIGNED_COLUMN)}
            isDropTarget={drag.dropTarget === UNASSIGNED_COLUMN}
            searching={Boolean(term)}
            canSelect={canMove}
            allSelected={visibleUnassigned.length > 0 && visibleUnassigned.every((a) => selectedIds.has(a.id))}
            onToggleCollapse={toggleCollapse}
            onToggleSelection={toggleColumnSelection}
          >
            {renderAnimals(visibleUnassigned)}
          </PotreroColumn>
        )}

        {!onlyUnassigned &&
          fields.map((field) => {
            const animals = visibleByField.get(field.id) || [];
            return (
              <PotreroColumn
                key={field.id}
                columnKey={field.id}
                label={field.name}
                animals={animals}
                total={countByField.get(field.id) || 0}
                field={field}
                collapsed={collapsed.has(field.id)}
                isDropTarget={drag.dropTarget === field.id}
                searching={Boolean(term)}
                canSelect={canMove}
                allSelected={animals.length > 0 && animals.every((a) => selectedIds.has(a.id))}
                onToggleCollapse={toggleCollapse}
                onToggleSelection={toggleColumnSelection}
              >
                {renderAnimals(animals)}
              </PotreroColumn>
            );
          })}
      </div>

      {canMove && selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card p-3 shadow-2xl">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-bold text-foreground">
              {selectedCount} {selectedCount === 1 ? 'animal elegido' : 'animales elegidos'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="lg" className="h-12 flex-1 sm:flex-initial" onClick={clearSelection}>
                Quitar selección
              </Button>
              <Button
                size="lg"
                className="h-12 flex-1 sm:flex-initial sm:min-w-56"
                onClick={() => setMoveOpen(true)}
                loading={saving}
                disabled={saving}
              >
                <MapPin className="mr-2 h-5 w-5" />
                Mover a otro potrero
              </Button>
            </div>
          </div>
        </div>
      )}

      <MoveAnimalsDialog
        isOpen={moveOpen}
        onClose={() => setMoveOpen(false)}
        count={selectedCount}
        fields={fields}
        countByField={countByField}
        originFieldId={commonOrigin}
        saving={saving}
        onConfirm={(targetFieldId) => {
          setMoveOpen(false);
          void runMove(Array.from(selectedIds), targetFieldId);
        }}
      />

      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </BoardShell>
  );
}

export default PotrerosBoardPage;
