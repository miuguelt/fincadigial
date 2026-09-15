import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { reportError } from '@/shared/lib/errorReporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ContentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error.message, 'react', { componentStack: info.componentStack }, error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 w-full min-h-[400px]">
          <div className="max-w-lg w-full bg-card rounded-2xl border border-destructive/20 p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                No se pudo cargar esta sección
              </h2>
              <p className="text-sm text-muted-foreground">
                Ocurrió un problema al presentar este módulo. Tu sesión, la barra superior y el menú lateral continúan funcionando con normalidad.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-muted/40 rounded-xl p-3.5 border border-border/60 text-xs font-mono text-muted-foreground overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
              <Button
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/admin/animals';
                }}
                className="inline-flex items-center justify-center gap-2 bg-success hover:bg-green-700 text-white rounded-xl"
              >
                <Home className="h-4 w-4" />
                Ir a Animales
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ContentErrorBoundary;
