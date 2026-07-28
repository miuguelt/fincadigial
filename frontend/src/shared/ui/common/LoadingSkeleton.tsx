interface LoadingCardsProps {
	count?: number;
	height?: string;
}

export function LoadingCards({
	count = 3,
	height = "h-28",
}: LoadingCardsProps) {
	return (
		<div className="space-y-3">
			{Array.from({ length: count }, (_, i) => (
				<div
					key={i}
					className={`${height} rounded-lg bg-muted animate-pulse`}
				/>
			))}
		</div>
	);
}

interface LoadingGridProps {
	count?: number;
	cols?: string;
	height?: string;
}

export function LoadingGrid({
	count = 6,
	cols = "sm:grid-cols-2 lg:grid-cols-3",
	height = "h-64",
}: LoadingGridProps) {
	return (
		<div className={`grid grid-cols-1 ${cols} gap-3 sm:gap-4`}>
			{Array.from({ length: count }, (_, i) => (
				<div
					key={i}
					className={`${height} rounded-xl bg-muted/50 animate-pulse border border-border/30`}
				/>
			))}
		</div>
	);
}
