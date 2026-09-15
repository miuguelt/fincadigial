import React from 'react';
import { ChevronDown, Wrench, Sparkles } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu';

export interface ZootecnicToolItem {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'outline';
  highlight?: boolean;
}

export interface ZootecnicToolsDropdownProps {
  tools: ZootecnicToolItem[];
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
  /**
   * Si es true, las herramientas con `highlight` se muestran también como botones directos
   * en pantallas grandes (lg+), y todo en el dropdown en pantallas pequeñas.
   */
  showHighlightedDirectly?: boolean;
}

export const ZootecnicToolsDropdown: React.FC<ZootecnicToolsDropdownProps> = ({
  tools,
  label = 'Herramientas',
  icon = <Wrench size={14} className="text-primary" />,
  className,
  align = 'end',
  showHighlightedDirectly = false,
}) => {
  if (!tools || tools.length === 0) return null;

  const highlightedTools = showHighlightedDirectly
    ? tools.filter((t) => t.highlight)
    : [];

  return (
    <div className={cn('flex items-center gap-1.5 shrink-0', className)}>
      {/* Botones directos destacados (visibles solo en pantallas grandes si se solicita) */}
      {highlightedTools.map((tool) => (
        <Button
          key={`direct-${tool.id}`}
          variant="outline"
          size="sm"
          onClick={tool.onClick}
          className="hidden xl:inline-flex h-8 gap-1.5 px-3 text-xs font-bold border-border/60 hover:bg-muted/80 shadow-2xs rounded-xl"
          title={tool.description || tool.label}
        >
          {tool.icon}
          <span>{tool.shortLabel || tool.label}</span>
          {tool.badge && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold ml-0.5">
              {tool.badge}
            </span>
          )}
        </Button>
      ))}

      {/* Menú desplegable unificado */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-bold border-border/60 bg-card/70 hover:bg-card text-foreground shadow-2xs rounded-xl"
            aria-label="Abrir menú de herramientas de campo"
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden text-xs">Utilidades</span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          sideOffset={6}
          className="w-72 sm:w-80 p-1.5 rounded-2xl border-border/60 bg-popover/95 backdrop-blur-md shadow-xl z-50"
        >
          <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Herramientas Zootécnicas</span>
            <Sparkles size={13} className="text-primary" />
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-border/50" />

          <div className="space-y-1">
            {tools.map((tool) => (
              <DropdownMenuItem
                key={tool.id}
                onClick={tool.onClick}
                className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
              >
                <div className="p-2 rounded-lg bg-background/80 border border-border/50 shrink-0 text-foreground shadow-2xs mt-0.5">
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-foreground fit-clamp">
                      {tool.label}
                    </span>
                    {tool.badge && (
                      <Badge
                        variant={tool.badgeVariant || 'outline'}
                        size="sm"
                        className="text-[11px] px-1.5 py-0 font-bold"
                      >
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                      {tool.description}
                    </p>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ZootecnicToolsDropdown;
