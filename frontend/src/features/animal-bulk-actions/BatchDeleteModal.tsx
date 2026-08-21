import React, { useState } from 'react';

import { bulkDeleteAnimals, type BlockedAnimal } from '@/entities/animal/api/animalBulkDelete.service';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { IconLoader2, IconTrash } from '@/shared/ui/icons';

interface BatchDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAnimalIds: number[];
  onDeleted: (message: string) => void;
}

interface Resultado {
  deletedIds: number[];
  blocked: BlockedAnimal[];
  message: string;
}

/**
 * Eliminación masiva de animales con el resultado a la vista.
 *
 * Los animales que la base de datos no deja eliminar se listan con su motivo
 * en lugar de perderse en un aviso genérico.
 */
export const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  isOpen,
  onClose,
  selectedAnimalIds,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = selectedAnimalIds.length;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const respuesta = await bulkDeleteAnimals(selectedAnimalIds);
    setLoading(false);

    if (!respuesta.success && respuesta.deletedIds.length === 0 && respuesta.blocked.length === 0) {
      setError(respuesta.message);
      return;
    }

    setResultado({
      deletedIds: respuesta.deletedIds,
      blocked: respuesta.blocked,
      message: respuesta.message,
    });

    if (respuesta.blocked.length === 0) {
      onDeleted(respuesta.message);
    }
  };

  const cerrar = () => {
    const eliminados = resultado?.deletedIds.length ?? 0;
    setResultado(null);
    setError(null);
    if (eliminados > 0 && (resultado?.blocked.length ?? 0) > 0) {
      onDeleted(resultado!.message);
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) cerrar(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-card p-0 text-card-foreground sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 px-5 py-5 sm:px-6">
          <DialogTitle className="text-lg font-bold text-foreground">
            {resultado ? 'Resultado de la eliminación' : `Eliminar ${total} animal${total === 1 ? '' : 'es'}`}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
            {resultado
              ? resultado.message
              : 'Se eliminarán también los registros que dependen de cada animal (controles, tratamientos, vacunaciones, alertas y asignaciones a potreros).'}
          </DialogDescription>
        </DialogHeader>

        <div className="mx-5 mt-5 max-h-[45dvh] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-5 text-muted-foreground sm:mx-6">
          {error && <p className="text-destructive">{error}</p>}

          {!resultado && !error && (
            <p>
              Los animales con producción de leche, eventos reproductivos, tareas o transacciones
              asociadas no se pueden eliminar: la base de datos conserva esa información.
            </p>
          )}

          {resultado && (
            <>
              <p className="font-semibold text-foreground">
                Eliminados: {resultado.deletedIds.length} de {total}
              </p>
              {resultado.blocked.map((animal) => (
                <div key={animal.id}>
                  <p className="font-semibold text-foreground">{animal.label}</p>
                  <ul className="list-disc pl-5">
                    {animal.blocking.map((dependency) => (
                      <li key={`${animal.id}-${dependency.table ?? dependency.label}`}>
                        {dependency.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="mt-5 gap-2 border-t border-border/70 px-5 py-4 sm:flex-row sm:px-6">
          {resultado ? (
            <Button type="button" variant="primary" size="lg" className="w-full sm:w-auto" onClick={cerrar}>
              Entendido
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={cerrar} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleDelete}
                disabled={loading || total === 0}
              >
                {loading ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                Eliminar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
