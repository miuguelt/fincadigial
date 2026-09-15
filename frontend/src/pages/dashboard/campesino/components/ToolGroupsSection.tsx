import { ChevronRight, Search, Wifi, WifiOff, Wrench } from 'lucide-react';
import type { ToolGroup, ToolItem } from '../config/dashboard.config';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { ModuleHeading } from '@/widgets/layout/ModuleHeading';

interface ToolGroupsSectionProps {
  groups: ToolGroup[];
  onClearSearch: () => void;
  onNavigate: (path: string) => void;
}

interface ToolCardProps {
  tool: ToolItem;
  onNavigate: (path: string) => void;
}

function ToolCard({ tool, onNavigate }: ToolCardProps) {
  const ToolIcon = tool.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(tool.path)}
      className="group flex min-h-[76px] w-full items-center gap-3.5 rounded-xl border border-border/70 bg-background/60 p-3.5 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${tool.title}. ${tool.description}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <ToolIcon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {tool.title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground fit-clamp">
          {tool.description}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge className={`${getStatusBadgeClass(tool.requiresOnline ? 'warning' : 'neutral')} text-[11px] px-1.5 py-0`}>
          {tool.requiresOnline ? (
            <span className="flex items-center gap-1">
              <Wifi className="h-2.5 w-2.5" /> En línea
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <WifiOff className="h-2.5 w-2.5" /> Offline
            </span>
          )}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </div>
    </button>
  );
}

function EmptyToolsState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <Card className="border-2 border-dashed border-border/80 bg-card p-12 text-center" premium={false} hoverable={false}>
      <Search className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden="true" />
      <p className="mt-3 text-base font-bold text-foreground">No se encontraron herramientas</p>
      <p className="mt-1 text-sm text-muted-foreground">Prueba buscando con términos como «ordeño», «parcela», «clima» o «salud».</p>
      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
        >
          Ver todas las herramientas
        </Button>
      </div>
    </Card>
  );
}

export function ToolGroupsSection({ groups, onClearSearch, onNavigate }: ToolGroupsSectionProps) {
  if (groups.length === 0) return <EmptyToolsState onClearSearch={onClearSearch} />;

  return (
    <section aria-labelledby="tools-title" className="space-y-4">
      <ModuleHeading
        title={<span id="tools-title">Directorio de Módulos y Herramientas</span>}
        description="Acceso a todas las operaciones de ganado, cultivos, clima y soporte técnico"
        icon={<Wrench className="h-5 w-5 text-white" />}
        headingLevel="h2"
        titleClassName="text-base sm:text-lg"
      />

      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.title} className="border-border/70 shadow-sm" premium hoverable={false}>
            <CardHeader className="py-3.5 px-4 sm:px-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {group.tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} onNavigate={onNavigate} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
