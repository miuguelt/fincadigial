import { PawPrint } from 'lucide-react';

export function AnimalsStatusHeading() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success-500 to-success-600 shadow-lg shadow-success-500/20">
        <PawPrint className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="fit-clamp text-lg font-black tracking-tight text-foreground">
          Animales
        </h1>
        <p className="fit-clamp text-xs font-medium text-muted-foreground">
          Control integral del inventario y la sanidad animal
        </p>
      </div>
    </div>
  );
}
