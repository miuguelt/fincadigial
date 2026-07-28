import { Calendar, Syringe } from "lucide-react";
import type React from "react";
import { useCallback, useMemo } from "react";
import type { TreatmentResponse } from "@/shared/api/generated/swaggerTypes";
import { Button } from "@/shared/ui/button";

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
 * Example: "hace 2 días", "hoy", "hace 1 semana"
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
	const diagnosis = (item as any).diagnosis || (item as any).description || "—";
	const dosis = (item as any).dosis || "—";
	const frequency = (item as any).frequency || "";
	const dateLabel = timeAgo(item.treatment_date);

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
			{/* Selection checkbox (only if selection is enabled) */}
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
						<span className="font-bold text-sm sm:text-base text-foreground truncate">
							{animalLabel}
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
						<Calendar className="w-3.5 h-3.5" />
						<span className="font-medium">{dateLabel}</span>
					</div>
				</div>

				{/* Row 2: Diagnosis */}
				<div className="flex items-start gap-2 mb-1.5">
					<span className="text-base mt-0.5" role="img" aria-label="diagnosis">🩺</span>
					<p className="text-sm font-semibold text-foreground/90 line-clamp-2 leading-snug">
						{diagnosis}
					</p>
				</div>

				{/* Row 3: Dosage + Frequency — solo si hay datos */}
				{dosisDisplay !== "—" && (
					<div className="flex items-center gap-2 mb-3">
						<span className="text-base" role="img" aria-label="dosage">💊</span>
						<p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
							{dosisDisplay}
						</p>
					</div>
				)}

				{/* Row 4: Actions — botones sólidos de alto contraste, targets 44px */}
				<div className="flex items-center gap-2 pt-2 border-t border-border/30">
					<Button
						size="sm"
						onClick={handleSuppliesClick}
						className="flex-1 h-11 text-xs sm:text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-all"
					>
						<Syringe className="w-4 h-4 mr-1.5" />
						Insumos
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={handleEditClick}
						className="flex-1 h-11 text-xs sm:text-sm font-bold text-foreground border-border hover:bg-muted rounded-xl"
					>
						Editar
					</Button>
				</div>
			</div>
		</div>
	);
};
