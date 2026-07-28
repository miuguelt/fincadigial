import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface EmptyStateSimpleProps {
	icon: string;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	actionVariant?: "primary" | "outline";
	accentColor?: string;
}

const accentBorders: Record<string, string> = {
	emerald: "border-emerald-400 text-emerald-700 dark:text-emerald-300",
	cyan: "border-cyan-400 text-cyan-700 dark:text-cyan-300",
	blue: "border-blue-400 text-blue-700 dark:text-blue-300",
	purple: "border-purple-400 text-purple-700 dark:text-purple-300",
	orange: "border-orange-400 text-orange-700 dark:text-orange-300",
	primary: "border-primary text-primary",
};

export function EmptyStateSimple({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	actionVariant = "outline",
	accentColor = "primary",
}: EmptyStateSimpleProps) {
	const borderCls = accentBorders[accentColor] ?? accentBorders.primary;

	return (
		<div className="text-center py-16 space-y-3">
			<span className="text-5xl">{icon}</span>
			<p className="text-muted-foreground font-medium">{title}</p>
			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
			{actionLabel && onAction && (
				<Button
					onClick={onAction}
					variant={actionVariant}
					className={actionVariant === "outline" ? borderCls : ""}
				>
					<Plus className="w-4 h-4 mr-2" /> {actionLabel}
				</Button>
			)}
		</div>
	);
}
