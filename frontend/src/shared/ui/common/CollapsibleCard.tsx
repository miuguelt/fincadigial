import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/button';

interface CollapsibleCardProps {
    title: string;
    children: React.ReactNode;
    defaultCollapsed?: boolean;
    className?: string;
    accent?: 'blue' | 'cyan' | 'teal' | 'emerald' | 'purple' | 'indigo' | 'red' | 'amber' | 'slate';
    /** Contador que acompaña al título, p. ej. el número de filas de la sección. */
    badgeCount?: number;
    /** Controles alineados a la derecha de la cabecera (exportar, filtrar…). */
    headerActions?: React.ReactNode;
}

export function CollapsibleCard({
    title,
    children,
    defaultCollapsed = false,
    className,
    accent = 'slate',
    badgeCount,
    headerActions
}: CollapsibleCardProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    const accentClasses: Record<string, { text: string; bar: string }> = {
        blue: { text: "text-blue-700 dark:text-blue-300", bar: "bg-blue-500 shadow-blue-500/20" },
        cyan: { text: "text-cyan-700 dark:text-cyan-300", bar: "bg-cyan-500 shadow-cyan-500/20" },
        teal: { text: "text-teal-700 dark:text-teal-300", bar: "bg-teal-500 shadow-teal-500/20" },
        emerald: { text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500 shadow-emerald-500/20" },
        purple: { text: "text-purple-700 dark:text-purple-300", bar: "bg-purple-500 shadow-purple-500/20" },
        indigo: { text: "text-indigo-700 dark:text-indigo-300", bar: "bg-indigo-500 shadow-indigo-500/20" },
        red: { text: "text-rose-700 dark:text-rose-300", bar: "bg-rose-500 shadow-rose-500/20" },
        amber: { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500 shadow-amber-500/20" },
        slate: { text: "text-foreground dark:text-muted-foreground", bar: "bg-muted-foreground shadow-slate-500/20" },
    };

    const cfg = accentClasses[accent] || accentClasses.slate;

    return (
        <div className={cn(
            "rounded-2xl border border-border/70 dark:border-white/10 shadow-sm overflow-hidden transition-all duration-200 bg-card/70 dark:bg-card/40 backdrop-blur-sm",
            "hover:shadow-md hover:border-primary/30",
            className
        )}>
            <div
                className={cn(
                    "flex items-center justify-between p-3.5 sm:p-4 cursor-pointer transition-colors border-b border-border/50",
                    isCollapsed ? "bg-card/50 hover:bg-muted/30" : "bg-card hover:bg-muted/40"
                )}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("w-1.5 h-4.5 rounded-full shadow-sm", cfg.bar)} />
                    <h3 className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        cfg.text
                    )}>
                        {title}
                    </h3>
                    {badgeCount != null && (
                        <span className="rounded-full bg-muted/80 border border-border/50 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                            {badgeCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {headerActions}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <div className={cn(
                "transition-all duration-300 ease-in-out",
                isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2500px] opacity-100 overflow-visible'
            )}>
                <div className="p-4 sm:p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}
