import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { GlobalSearchBar } from '@/features/search/ui/GlobalSearchBar';
import { cn } from '@/shared/ui/cn';

/**
 * Buscador de la finca en el encabezado. Vivía dentro del menú hamburguesa;
 * al dejar ese menú solo con la lista de secciones, la búsqueda pasa aquí:
 * barra fija en pantallas grandes y lupa desplegable en celular.
 */
const HeaderSearch: React.FC = () => {
  const [openOnMobile, setOpenOnMobile] = useState(false);

  return (
    <>
      <div className="hidden min-w-0 flex-1 justify-center lg:flex">
        <GlobalSearchBar placeholder="Buscar en la finca..." className="w-full max-w-md" />
      </div>

      <button
        type="button"
        onClick={() => setOpenOnMobile((prev) => !prev)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-primary/10 hover:text-primary lg:hidden',
          openOnMobile && 'bg-primary/10 text-primary',
        )}
        aria-label={openOnMobile ? 'Cerrar búsqueda' : 'Buscar en la finca'}
        aria-expanded={openOnMobile}
      >
        {openOnMobile ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </button>

      {openOnMobile && (
        <div className="absolute inset-x-0 top-full border-b border-border/30 bg-background/95 px-2 py-2 shadow-lg backdrop-blur-xl lg:hidden">
          <GlobalSearchBar
            autoFocus
            placeholder="Buscar en la finca..."
            className="w-full"
            onClose={() => setOpenOnMobile(false)}
          />
        </div>
      )}
    </>
  );
};

export default HeaderSearch;
