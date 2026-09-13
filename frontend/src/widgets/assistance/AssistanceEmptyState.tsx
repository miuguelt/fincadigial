import { LifeBuoy } from 'lucide-react';

interface AssistanceEmptyStateProps {
  onCreate: () => void;
}

export function AssistanceEmptyState({ onCreate }: AssistanceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20">
      <div className="w-full max-w-md mx-auto bg-card rounded-xl shadow-lg border border-border/30 p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
            <LifeBuoy className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">¿Tienes un problema en tu finca?</h3>
        <p className="text-sm text-muted-foreground max-w-prose mx-auto mb-6">
          Puedes pedir ayuda a la red veterinaria de tu finca. Recibirás la respuesta dentro de Villa Luz.
        </p>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <LifeBuoy className="w-4 h-4" />
          Pedir ayuda técnica
        </button>
      </div>
    </div>
  );
}
