import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeaderQuickActions from './HeaderQuickActions';

const ICON_BUTTON =
  'relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary';

/** Acciones operativas del encabezado. Las consultas viven en el menú personal. */
const HeaderActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-0.5">
      <HeaderQuickActions />

      <button
        type="button"
        onClick={() => navigate('/campesino/market-offers')}
        className={`${ICON_BUTTON} hidden sm:flex`}
        title="Mercado"
        aria-label="Mercado campesino"
      >
        <ShoppingBag className="h-5 w-5" />
      </button>
    </div>
  );
};

export default HeaderActions;
