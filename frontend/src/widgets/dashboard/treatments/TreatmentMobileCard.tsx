import { Calendar, Syringe, AlertTriangle, DollarSign, Eye, Edit3 } from "lucide-react";
import type React from "react";
import { useCallback, useMemo } from "react";
import type { TreatmentResponse } from "@/shared/api/generated/swaggerTypes";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

interface TreatmentMobileCardProps {
	item: TreatmentResponse & { [k: string]: any };
	animalLabel: string;
	isSelected?: boolean;
	onSelect?: (id: number) => void;
	onOpenDetail?: (item: TreatmentResponse) => void;
	onOpenSupplies?: (item: TreatmentResponse) => void;
	onEdit?: (item: TreatmentResponse) => void;
}

/**
 * Converts a date string to a human-readable relative time in Spanish.
 */
function timeAgo(dateStr: string | undefined | null): string {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return "—";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return `en ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? "s" : ""}`;
	if (diffDays === 0) return "hoy";
	if (diffDays === 1) return "ayer";
	if (diffDays < 7) return `hace ${diffDays} días`;
	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return `hace ${weeks} semana${weeks !== 1 ? "s" : ""}`;
	}
	if (diffDays < 365) {
		const months = Math.floor(diffDays / 30);
		return `hace ${months} mes${months !== 1 ? "es" : ""}`;
	}
	const years = Math.floor(diffDays / 365);
	return `hace ${years} año${years !== 1 ? "s" : ""}`;
}

/**
 * Formatea moneda en Pesos Colombianos (COP) compactos
 */
function formatCOP(amount?: number | string | null): string {
	if (amount === undefined || amount === null || amount === '') return '';
	const num = Number(amount);
	if (isNaN(num) || num <= 0) return '';
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		maximumFractionDigits: 0,
	}).format(num);
}

/**
 * Premium mobile-first card for livestock treatments.
 * Designed for farmers in the field: large touch targets, dense info, readable at a glance.
 */
export const TreatmentMobileCard: React.FC<TreatmentMobileCardProps> = ({
	item,
	animalLabel,
	isSelected,
	onSelect,
	onOpenDetail,
	onOpenSupplies,
	onEdit,
}) => {
	const diagnosis = (item as any).diagnosis || (item as any).description || "Tratamiento General";
	const dosis = (item as any).dosis || (item as any).dose || "—";
	const frequency = (item as any).frequency || (item as any).frecuencia || "";
	const dateLabel = timeAgo(item.treatment_date);
	const costFormatted = formatCOP(item.cost);

	// Verificación de período de retiro
	const withdrawalInfo = useMemo(() => {
		const withdrawalDays = Number(item.withdrawal_days) || 0;
		if (withdrawalDays <= 0 && !item.withdrawal_end_date) return null;

		let endDate: Date;
		if (item.withdrawal_end_date) {
			endDate = new Date(String(item.withdrawal_end_date));
		} else if (item.treatment_date) {
			endDate = new Date(String(item.treatment_date));
			endDate.setDate(endDate.getDate() + withdrawalDays);
		} else {
			return null;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		endDate.setHours(0, 0, 0, 0);
		const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		const isActive = diff >= 0;

		return {
			isActive,
			daysRemaining: Math.max(0, diff),
			totalDays: withdrawalDays,
		};
	}, [item]);

	const dosisDisplay = useMemo(() => {
		if (dosis === "—" && !frequency) return "—";
		const parts: string[] = [];
		if (dosis !== "—") parts.push(dosis);
		if (frequency) parts.push(frequency);
		return parts.join(" · ");
	}, [dosis, frequency]);

	const handleCardClick = useCallback(() => {
		if (onOpenDetail) {
			onOpenDetail(item);
		}
	}, [item, onOpenDetail]);

	const handleSuppliesClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (onOpenSupplies) onOpenSupplies(item);
		},
		[item, onOpenSupplies],
	);

	const handleEditClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (onEdit) onEdit(item);
		},
		[item, onEdit],
	);

	const handleSelectClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (onSelect && item.id) onSelect(item.id);
		},
		[item.id, onSelect],
	);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handleCardClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") handleCardClick();
			}}
			className={`
				group relative w-full text-left
				bg-card/60 backdrop-blur-xl
				rounded-2xl border transition-all duration-300
				hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5
				active:scale-[0.98] active:shadow-sm
				cursor-pointer
				${isSelected
					? "border-purple-500/60 bg-purple-500/5 shadow-md shadow-purple-500/10"
					: "border-border/40 hover:border-purple-500/30"
				}
			`}
		>
			{/* Selection checkbox */}
			{onSelect && (
				<button
					type="button"
					onClick={handleSelectClick}
					className="absolute top-3 left-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
						hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
					style={{
						borderColor: isSelected ? "rgb(168, 85, 247)" : undefined,
						backgroundColor: isSelected ? "rgb(168, 85, 247)" : undefined,
					}}
				>
					{isSelected && (
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
							<path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					)}
				</button>
			)}

			{/* Main content */}
			<div className="p-4 sm:p-5">
				{/* Row 1: Animal + Date */}
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<span className="text-lg" role="img" aria-label="animal">🐄</span>
						<span className="font-bold text-sm sm:text-base text-foreground fit-clamp">
							{animalLabel}
						</span>
						<Badge variant="outline" className="text-[11px] h-4 px-1 rounded bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200/50 shrink-0">
							#{item.id}
						</Badge>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
						<Calendar className="w-3.5 h-3.5" />
						<span className="font-medium">{dateLabel}</span>
					</div>
				</div>

				{/* Row 2: Diagnosis */}
				<div className="flex items-start gap-2 mb-2">
					<span className="text-base mt-0.5" role="img" aria-label="diagnosis">🩺</span>
					<p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
						{diagnosis}
					</p>
				</div>

				{/* Row 3: Posología + Retiro / Costo */}
				<div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
					{dosisDisplay !== "—" && (
						<div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg text-muted-foreground font-medium">
							<span>💊</span>
							<span>{dosisDisplay}</span>
						</div>
					)}

					{costFormatted && (
						<div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-bold">
							<DollarSign className="w-3.5 h-3.5" />
							<span>{costFormatted}</span>
						</div>
					)}

					{withdrawalInfo && (
						<Badge
							className={`text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
								withdrawalInfo.isActive
									? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 animate-pulse'
									: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
							}`}
						>
							{withdrawalInfo.isActive ? (
								<>
									<AlertTriangle className="w-3 h-3 text-amber-600" />
									<span>Retiro: {withdrawalInfo.daysRemaining}d</span>
								</>
							) : (
								<span>Retiro OK</span>
							)}
						</Badge>
					)}
				</div>

				{/* Row 4: Actions — botones sólidos de alto contraste, targets 44px */}
				<div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
					<Button
						variant="outline"
						size="sm"
						onClick={handleCardClick}
						className="h-11 text-xs font-bold text-foreground border-border hover:bg-muted rounded-xl flex items-center justify-center gap-1"
					>
						<Eye className="w-4 h-4" />
						<span>Detalle</span>
					</Button>

					<Button
						size="sm"
						onClick={handleSuppliesClick}
						className="h-11 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-all flex items-center justify-center gap-1"
					>
						<Syringe className="w-4 h-4" />
						<span>Insumos</span>
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={handleEditClick}
						className="h-11 text-xs font-bold text-foreground border-border hover:bg-muted rounded-xl flex items-center justify-center gap-1"
					>
						<Edit3 className="w-4 h-4" />
						<span>Editar</span>
					</Button>
				</div>
			</div>
		</div>
	);
};

export default TreatmentMobileCard;
