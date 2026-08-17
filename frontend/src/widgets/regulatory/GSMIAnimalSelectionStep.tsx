import React from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckSquare, Loader2, Search, Square } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { MovementDestinationType } from './gsmI.types';

interface GSMIAnimalSelectionStepProps {
  animals: any[];
  withdrawalAnimals: any[];
  loading: boolean;
  selectedIds: Set<number>;
  searchTerm: string;
  categoryFilter: string;
  activeWithdrawals: Map<number, string>;
  destinationType: MovementDestinationType;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onToggleAll: () => void;
  onToggleAnimal: (id: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const GSMIAnimalSelectionStep: React.FC<GSMIAnimalSelectionStepProps> = ({
  animals,
  withdrawalAnimals,
  loading,
  selectedIds,
  searchTerm,
  categoryFilter,
  activeWithdrawals,
  destinationType,
  onSearchChange,
  onCategoryChange,
  onToggleAll,
  onToggleAnimal,
  onBack,
  onNext,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por chapeta o raza..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-xs font-bold"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleAll}
          className="rounded-xl text-xs font-bold shrink-0"
        >
          {selectedIds.size === animals.length && animals.length > 0 ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Deseleccionar
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 mr-1" />
              Todos ({animals.length})
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'males', label: 'Machos' },
          { id: 'females', label: 'Hembras' },
          { id: 'calves', label: 'Terneros (<180kg)' },
        ].map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onCategoryChange(filter.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === filter.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {withdrawalAnimals.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-black block uppercase">
              ⚠️ {withdrawalAnimals.length} animales seleccionados tienen periodo de retiro activo:
            </span>
            <p className="text-[11px] mt-0.5">
              {withdrawalAnimals
                .map((animal) => `${animal.record || animal.id} (hasta ${activeWithdrawals.get(animal.id)})`)
                .join(', ')}.
              {destinationType === 'slaughterhouse' && ' PROHIBIDO el despacho a planta de beneficio/consumo humano.'}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-48 flex items-center justify-center text-xs font-bold text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando inventario de ganado...
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {animals.map((animal) => {
            const isSelected = selectedIds.has(animal.id);
            const isUnderWithdrawal = activeWithdrawals.has(animal.id);

            return (
              <div
                key={animal.id}
                onClick={() => onToggleAnimal(animal.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs'
                    : 'bg-card border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleAnimal(animal.id)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <div>
                    <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <span>{animal.record || `ID #${animal.id}`}</span>
                      {isUnderWithdrawal && (
                        <span className="text-[11px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                          [EN RETIRO]
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {animal.breed?.name || animal.breed_name || 'Sin raza'} · {animal.sex || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-foreground">
                    {animal.weight ? `${animal.weight} kg` : 'Sin peso'}
                  </span>
                  <p className="text-[11px] text-emerald-600 font-bold">🛡️ Aftosa Vigente</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Atrás
        </Button>

        <Button
          type="button"
          disabled={selectedIds.size === 0}
          onClick={onNext}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black"
        >
          <span>Generar Resumen ({selectedIds.size})</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
