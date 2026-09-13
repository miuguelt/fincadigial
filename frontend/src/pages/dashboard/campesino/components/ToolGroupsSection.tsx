import { ChevronDown, ChevronRight, Search, Wifi, WifiOff } from 'lucide-react';
import type { ToolGroup, ToolItem } from '../config/dashboard.config';

interface ToolGroupsSectionProps {
  groups: ToolGroup[];
  onClearSearch: () => void;
  onNavigate: (path: string) => void;
}

interface ToolCardProps {
  group: ToolGroup;
  tool: ToolItem;
  onNavigate: (path: string) => void;
}

function ToolCard({ group, tool, onNavigate }: ToolCardProps) {
  const ToolIcon = tool.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(tool.path)}
      className={`group flex min-h-[84px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary sm:p-4 ${tool.bg}`}
      aria-label={`${tool.title}. ${tool.description}`}
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 text-2xl shadow-sm dark:bg-black/20" aria-hidden="true">
        {tool.emoji || <ToolIcon className="h-5 w-5 text-muted-foreground" />}
        <span className="absolute -bottom-1 -right-1 rounded-full border border-border/30 bg-card p-1 shadow-sm">
          <ToolIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold leading-tight ${group.color}`}>{tool.title}</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{tool.description}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <SignalBadge requiresOnline={tool.requiresOnline} />
        <ChevronRight className={`h-4 w-4 ${group.color}`} aria-hidden="true" />
      </span>
    </button>
  );
}

function SignalBadge({ requiresOnline }: { requiresOnline: boolean }) {
  return requiresOnline ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-amber-700 dark:text-amber-300">
      <Wifi className="h-3 w-3" aria-hidden="true" /> Con señal
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
      <WifiOff className="h-3 w-3" aria-hidden="true" /> Sin señal
    </span>
  );
}

function EmptyToolsState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card px-5 py-12 text-center">
      <Search className="mx-auto h-9 w-9 text-muted-foreground/50" aria-hidden="true" />
      <p className="mt-3 text-base font-bold text-foreground">No encontramos esa herramienta</p>
      <p className="mt-1 text-sm text-muted-foreground">Pruebe con «ordeño», «parcela», «clima» o «salud».</p>
      <button
        type="button"
        onClick={onClearSearch}
        className="mt-5 min-h-11 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/20"
      >
        Ver todas las herramientas
      </button>
    </div>
  );
}

export function ToolGroupsSection({ groups, onClearSearch, onNavigate }: ToolGroupsSectionProps) {
  if (groups.length === 0) return <EmptyToolsState onClearSearch={onClearSearch} />;

  return (
    <section aria-labelledby="tools-title" className="space-y-3">
      <div>
        <h2 id="tools-title" className="text-lg font-bold text-foreground">Todas las herramientas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Organizadas para trabajar, cuidar y decidir mejor.</p>
      </div>

      <div className="space-y-3">
        {groups.map((group, groupIndex) => (
          <details key={group.title} open={groupIndex === 0} className="group/section rounded-2xl border border-border bg-card shadow-sm">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
              <span className={`text-sm font-bold ${group.color}`}>{group.title}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/section:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-2 border-t border-border/70 p-3 sm:grid-cols-2 sm:p-4">
              {group.tools.map((tool) => (
                <ToolCard key={tool.id} group={group} tool={tool} onNavigate={onNavigate} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
