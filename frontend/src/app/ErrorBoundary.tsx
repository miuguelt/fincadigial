import  { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '@/shared/lib/errorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorId: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error.message, 'react', { componentStack: info.componentStack }, error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorScreen error={this.state.error} errorId={this.state.errorId} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function ErrorScreen({
  error,
  errorId,
  onReset,
}: {
  error: Error | null;
  errorId: string;
  onReset: () => void;
}) {
  const isOffline = !navigator.onLine;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '1.5rem',
          padding: '2.5rem 2rem',
          maxWidth: '460px',
          width: '100%',
          color: '#f1f5f9',
          boxShadow: '0 25px 50px rgba(0,0,0,.5)',
        }}
      >
        {/* Icono */}
        <div
          style={{
            width: 72, height: 72,
            background: '#450a0a',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h1 style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, marginBottom: '.5rem' }}>
          Algo salió mal
        </h1>
        <p style={{ textAlign: 'center', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '.9rem' }}>
          {isOffline
            ? 'Parece que no hay conexión. Recupera la señal e intenta de nuevo.'
            : 'Ocurrió un error inesperado en la aplicación.'}
        </p>

        {/* Código de error */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '.75rem',
            padding: '.75rem 1rem',
            marginBottom: '1.5rem',
            fontFamily: 'monospace',
            fontSize: '.8rem',
            color: '#94a3b8',
          }}
        >
          <div style={{ color: '#64748b', marginBottom: '.25rem', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            ID: {errorId}
          </div>
          <div style={{ color: '#f87171', overflowWrap: 'anywhere' }}>
            {error?.message || 'Error desconocido'}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <button
            onClick={onReset}
            style={{
              padding: '.8rem 1.25rem', border: 'none', borderRadius: '.75rem',
              background: '#2563eb', color: '#fff',
              fontSize: '.95rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => { window.location.href = '/dashboard'; }}
            style={{
              padding: '.8rem 1.25rem', border: 'none', borderRadius: '.75rem',
              background: '#334155', color: '#e2e8f0',
              fontSize: '.95rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Ir al Dashboard
          </button>
          <button
            onClick={() => { window.location.reload(); }}
            style={{
              padding: '.8rem 1.25rem', border: '1px solid #334155', borderRadius: '.75rem',
              background: 'transparent', color: '#64748b',
              fontSize: '.9rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}
