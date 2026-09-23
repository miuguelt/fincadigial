import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  IconBuilding,
  IconExternalLink,
  IconInfoCircle,
  IconShieldCheck,
} from '@/shared/ui/icons';
import { OFFICIAL_REPOSITORIES } from '../data/builtinOfficialGuides';

export function OfficialRepositoriesSection() {
  const handleOpenRepo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Banner explicativo de literatura abierta en Colombia */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <IconShieldCheck className="h-5 w-5" aria-hidden={true} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
              Literatura Agropecuaria Colombiana Oficial, Gratuita y Libre
            </h2>
            <p className="text-xs leading-relaxed text-emerald-900/90 sm:text-sm dark:text-emerald-300/90">
              Las instituciones del Estado (AGROSAVIA, ICA, SENA) y fondos gremiales (FEDEGÁN, CIPAV) publican manuales,
              cartillas y formatos bajo políticas de <strong>Acceso Abierto (Open Access)</strong> y consulta pública ciudadana.
              Puedes consultar y descargar libremente estos documentos sin pagar suscripciones ni infringir derechos de autor.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de repositorios oficiales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFICIAL_REPOSITORIES.map((repo) => (
          <Card
            key={repo.id}
            className="flex flex-col justify-between rounded-2xl border-border/80 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md"
          >
            <CardHeader className="space-y-2 p-5 pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="bg-emerald-100 font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                  {repo.badge}
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">{repo.entity}</span>
              </div>
              <CardTitle className="text-base font-bold leading-snug">
                {repo.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3.5 p-5 pt-0 text-xs sm:text-sm">
              <p className="leading-relaxed text-muted-foreground">
                {repo.description}
              </p>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider block">
                  Material destacado:
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {repo.bestFor}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <IconInfoCircle className="h-4 w-4 shrink-0" aria-hidden={true} />
                <span>{repo.freeAccessNote}</span>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-0">
              <Button
                variant="outline"
                className="min-h-11 w-full border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50 flex items-center justify-center gap-2"
                onClick={() => handleOpenRepo(repo.url)}
              >
                <IconBuilding size="sm" aria-hidden={true} />
                Visitar Repositorio
                <IconExternalLink className="h-3.5 w-3.5" aria-hidden={true} />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
