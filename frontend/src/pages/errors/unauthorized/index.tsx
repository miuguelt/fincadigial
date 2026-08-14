import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';

const UnauthorizedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth() as { isAuthenticated: boolean };
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const homePath = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-surface-secondary">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-lg text-center border border-border">
        <h1 className="text-4xl font-bold text-destructive mb-4">Acceso denegado</h1>
        <p className="text-text-secondary mb-2">
          {isAuthenticated
            ? 'Tu usuario no tiene permisos para ver esta página.'
            : 'Inicia sesión con un usuario autorizado para continuar.'}
        </p>
        {fromPath && (
          <p className="text-sm text-text-secondary/80 mb-4">
            Ruta solicitada: <span className="font-mono text-text-primary">{fromPath}</span>
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate(homePath, { replace: true })}
            className="px-4 py-2 border border-border text-text-primary rounded-md hover:bg-ghost-primary"
          >
            {isAuthenticated ? 'Volver a mi panel' : 'Ir al inicio'}
          </button>
          {!isAuthenticated && (
            <Link
              to="/login"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
