import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/ui/cn";

export interface InventoryStockProgressBarProps {
	currentQuantity: number;
	initialQuantity?: number;
	minStock?: number;
	unit: string;
	isLowStock?: boolean;
	compact?: boolean;
	showMinStockLabel?: boolean;
	className?: string;
}

export type StockStatusLevel = "out_of_stock" | "critical" | "warning" | "optimal";

export function getStockStatusLevel(
	current: number,
	initial: number,
	minStock: number,
	isLowStock?: boolean,
): StockStatusLevel {
	if (current <= 0) return "out_of_stock";
	if (isLowStock || current <= minStock) return "critical";
	
	// Si el stock está entre el mínimo y 1.5 veces el mínimo, o <= 30% del lote inicial
	const percentage = initial > 0 ? (current / initial) * 100 : 100;
	if (percentage <= 30 || current <= minStock * 1.5) return "warning";
	
	return "optimal";
}

export const STATUS_CONFIG: Record<
	StockStatusLevel,
	{
		label: string;
		badgeClass: string;
		barClass: string;
		glowClass: string;
		textClass: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	out_of_stock: {
		label: "Agotado",
		badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
		barClass: "bg-destructive",
		glowClass: "shadow-[0_0_8px_rgba(239,68,68,0.4)]",
		textClass: "text-destructive font-black",
		icon: XCircle,
	},
	critical: {
		label: "Stock Crítico",
		badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
		barClass: "bg-rose-500",
		glowClass: "shadow-[0_0_8px_rgba(244,63,94,0.35)]",
		textClass: "text-rose-600 dark:text-rose-400 font-bold",
		icon: AlertCircle,
	},
	warning: {
		label: "Por agotarse",
		badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
		barClass: "bg-amber-500",
		glowClass: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
		textClass: "text-amber-700 dark:text-amber-400 font-bold",
		icon: AlertTriangle,
	},
	optimal: {
		label: "Disponible",
		badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
		barClass: "bg-emerald-500",
		glowClass: "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
		textClass: "text-emerald-700 dark:text-emerald-400 font-bold",
		icon: CheckCircle2,
	},
};

export function InventoryStockProgressBar({
	currentQuantity,
	initialQuantity,
	minStock = 5,
	unit,
	isLowStock,
	compact = false,
	showMinStockLabel = true,
	className,
}: InventoryStockProgressBarProps) {
	const current = Number(currentQuantity) || 0;
	// Si initialQuantity no viene o es menor al actual (por reabastecimientos), tomamos el mayor
	const total = Math.max(Number(initialQuantity) || 0, current, 1);
	const minThreshold = Number(minStock) || 0;

	// Porcentaje acotado de 0 a 100%
	const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;
	
	const statusLevel = getStockStatusLevel(current, total, minThreshold, isLowStock);
	const config = STATUS_CONFIG[statusLevel];
	const Icon = config.icon;

	if (compact) {
		return (
			<div className={cn("flex flex-col gap-1 w-full max-w-[200px]", className)}>
				<div className="flex items-center justify-between gap-1.5 text-xs">
					<span className={cn("font-bold truncate", config.textClass)}>
						{current} {unit}
					</span>
					<span className="text-[11px] text-muted-foreground font-medium shrink-0">
						{percentage}%
					</span>
				</div>
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80 dark:bg-slate-800">
					<div
						className={cn("h-full rounded-full transition-all duration-500", config.barClass)}
						style={{ width: `${percentage}%` }}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-1.5 w-full min-w-[170px] max-w-[260px]", className)}>
			{/* Línea superior: Cantidades numéricas y badge de estado */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-baseline gap-1">
					<span className={cn("text-sm font-black tracking-tight", config.textClass)}>
						{current}
					</span>
					<span className="text-xs text-muted-foreground font-medium">
						/ {total} {unit}
					</span>
				</div>
				<Badge
					variant="outline"
					className={cn(
						"px-1.5 py-0 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shrink-0",
						config.badgeClass
					)}
				>
					<Icon className="h-2.5 w-2.5 shrink-0" />
					{config.label}
				</Badge>
			</div>

			{/* Barra de progreso visual con testigo coloreado */}
			<div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800 shadow-inner">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500 ease-out",
						config.barClass,
						config.glowClass
					)}
					style={{ width: `${percentage}%` }}
					role="progressbar"
					aria-valuenow={current}
					aria-valuemin={0}
					aria-valuemax={total}
					aria-label={`Stock disponible: ${current} de ${total} ${unit} (${percentage}%)`}
				/>
			</div>

			{/* Subtítulo informativo de stock mínimo */}
			{showMinStockLabel && (
				<div className="flex items-center justify-between text-[11px] text-muted-foreground/80 leading-none">
					<span>
						{percentage}% restante
					</span>
					{minThreshold > 0 && (
						<span
							className={cn(
								"font-medium",
								current <= minThreshold ? "text-rose-600 dark:text-rose-400 font-semibold" : ""
							)}
						>
							Alerta mín: {minThreshold} {unit}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
