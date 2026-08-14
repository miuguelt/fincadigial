import { motion } from 'framer-motion';
import { ChevronRight, Search, Wifi, WifiOff } from 'lucide-react';
import type { ToolGroup, ToolItem } from '../config/dashboard.config';

interface ToolGroupsSectionProps {
  groups: ToolGroup[];
  onClearSearch: () => void;
  onNavigate: (path: string) => void;
}

interface ToolCardProps {
  group: ToolGroup;
  tool: ToolItem;
  index: number;
  groupIndex: number;
  onNavigate: (path: string) => void;
}

function ToolCard({ group, tool, index, groupIndex, onNavigate }: ToolCardProps) {
  const ToolIcon = tool.icon;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (groupIndex * 0.1) + (index * 0.05), duration: 0.4 }}
      whileHover={{ scale: 1.03, translateY: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onNavigate(tool.path)}
      className={`group relative flex min-h-[190px] w-full cursor-pointer flex-col overflow-hidden rounded-3xl border ${tool.bg} bg-card/50 p-5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-start justify-between w-full mb-5">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm transition-transform duration-500 group-hover:rotate-[-5deg] group-hover:scale-110 dark:bg-black/20">
          {tool.emoji}
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-background rounded-full p-1 shadow-sm border border-border/20">
            <ToolIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
        <SignalBadge requiresOnline={tool.requiresOnline} />
      </div>

      <div className="flex-1 mt-auto">
        <p className={`font-extrabold text-base md:text-lg mb-1 ${group.color} transition-colors duration-300`}>{tool.title}</p>
        <p className="text-sm text-muted-foreground/90 font-medium leading-relaxed">{tool.description}</p>
      </div>

      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 bg-white/50 dark:bg-black/20 p-2 rounded-full">
        <ChevronRight className={`w-5 h-5 ${group.color}`} />
      </div>
    </motion.button>
  );
}

function SignalBadge({ requiresOnline }: { requiresOnline: boolean }) {
  return requiresOnline ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 shadow-sm">
      <Wifi className="w-3 h-3" /> Con red
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm">
      <WifiOff className="w-3 h-3" /> Sin red OK
    </span>
  );
}

function EmptyToolsState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border-2 border-dashed border-border/60 bg-card/40 px-6 py-16 text-center shadow-sm backdrop-blur-sm"
    >
      <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <p className="text-lg md:text-xl font-bold text-foreground mb-2">No encontramos herramientas para tu búsqueda</p>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">Prueba con palabras como "ordeño", "parcela", "enfermedad" o "clima".</p>
      <button
        type="button"
        onClick={onClearSearch}
        className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
      >
        Ver todas las herramientas
      </button>
    </motion.div>
  );
}

export function ToolGroupsSection({ groups, onClearSearch, onNavigate }: ToolGroupsSectionProps) {
  return (
    <section className="space-y-10 pt-2">
      {groups.length === 0 ? <EmptyToolsState onClearSearch={onClearSearch} /> : groups.map((group, groupIndex) => (
        <div key={group.title} className="space-y-5">
          <h2 className={`flex items-center gap-3 border-b pb-3 text-lg font-extrabold uppercase tracking-wider md:text-xl ${group.color} ${group.border}`}>
            {group.title}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.tools.map((tool, index) => (
              <ToolCard key={tool.id} group={group} tool={tool} index={index} groupIndex={groupIndex} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
