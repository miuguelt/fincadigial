import type { ComponentType } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/ui/cn";
import { FitText } from "@/shared/ui/FitText";

export const inventoryNumber = new Intl.NumberFormat("es-CO");
type IconType = ComponentType<{ className?: string }>;

export function InventoryMetric({
	icon: Icon,
	label,
	value,
	detail,
	className,
	onClick,
	active = false,
	actionLabel,
}: {
	icon: IconType;
	label: string;
	value: string;
	detail: string;
	className?: string;
	/** Si se provee, la tarjeta filtra la tabla al hacer clic. */
	onClick?: () => void;
	active?: boolean;
	actionLabel?: string;
}) {
	const body = (
		<div className="flex items-start justify-between gap-3 text-left">
			<div className="min-w-0 flex-1">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{label}
				</p>
				{/* La cifra se encoge antes que partirse: "$ 364.000" no puede
				    quedar como "$ 364.00" y un "0" en el renglón siguiente. */}
				<FitText
					as="p"
					minScale={0.7}
					className={cn("mt-1 text-xl font-black sm:text-2xl", className)}
				>
					{value}
				</FitText>
				<p className="mt-1 text-xs text-muted-foreground">{detail}</p>
				{onClick && (
					<p className="mt-1 text-[11px] font-bold text-primary">
						{active ? "Filtro activo · quitar" : (actionLabel ?? "Ver en la tabla")}
					</p>
				)}
			</div>
			<Icon className={cn("h-5 w-5 shrink-0", className || "text-primary")} />
		</div>
	);

	return (
		<Card
			hoverable={false}
			premium={false}
			className={cn(
				"min-h-0 bg-card/70",
				active && "border-primary ring-1 ring-primary",
			)}
		>
			<CardContent className="p-0">
				{onClick ? (
					<button
						type="button"
						onClick={onClick}
						aria-pressed={active}
						className="w-full rounded-[inherit] p-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					>
						{body}
					</button>
				) : (
					<div className="p-4">{body}</div>
				)}
			</CardContent>
		</Card>
	);
}

export function InventoryRatioBar({
	label,
	value,
	total,
	color,
}: {
	label: string;
	value: number;
	total: number;
	color: string;
}) {
	const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
	return (
		<div className="space-y-1.5">
			<div className="flex justify-between gap-3 text-sm">
				<span className="font-medium">{label}</span>
				<span className="text-muted-foreground">
					{inventoryNumber.format(value)} · {percentage}%
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-muted/60">
				<div
					className={cn("h-full rounded-full transition-all", color)}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}
