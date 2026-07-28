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

    const accentClasses: Record<string, string> = {
        blue: "text-info dark:text-blue-300 before:bg-info shadow-blue-500/10",
        cyan: "text-cyan-700 dark:text-cyan-300 before:bg-cyan-500 shadow-cyan-500/10",
        teal: "text-teal-700 dark:text-teal-300 before:bg-teal-500 shadow-teal-500/10",
        emerald: "text-emerald-700 dark:text-emerald-300 before:bg-emerald-500 shadow-emerald-500/10",
        purple: "text-purple-700 dark:text-purple-300 before:bg-purple-500 shadow-purple-500/10",
        indigo: "text-indigo-700 dark:text-indigo-300 before:bg-indigo-500 shadow-indigo-500/10",
        red: "text-destructive dark:text-red-300 before:bg-destructive shadow-red-500/10",
        amber: "text-warning dark:text-amber-300 before:bg-warning shadow-amber-500/10",
        slate: "text-foreground/80 dark:text-muted-foreground/70 before:bg-muted shadow-slate-500/10",
    };

    const textClasses = accentClasses[accent] || accentClasses.slate;

    return (
        <div className={cn(
            "rounded-xl shadow-lg border overflow-hidden transition-all duration-300 bg-card",
            className || "border-border/60"
        )}>
            <div
                className={cn(
                    "flex items-center justify-between p-4 cursor-pointer transition-colors border-b border-border/40",
                    // Subtle gradient background for header based on accent could be nice, but keeping it clean for now
                    "hover:bg-accent/5",
                    isCollapsed ? "bg-card" : "bg-card/50"
                )}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("w-1 h-5 rounded-full shadow-sm", textClasses.split(' before:')[1])} />
                    <h3 className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        textClasses.split(' before:')[0]
                    )}>
                        {title}
                    </h3>
                    {badgeCount != null && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/80">
                            {badgeCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {headerActions}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-black/5 dark:hover:bg-card/10"
                    >
                        {isCollapsed ? <ChevronDown className="h-5 w-5 opacity-70" /> : <ChevronUp className="h-5 w-5 opacity-70" />}
                    </Button>
                </div>
            </div>
            <div className={cn(
                "transition-all duration-300 ease-in-out",
                isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100 overflow-visible'
            )}>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}
