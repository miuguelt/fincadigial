interface FilterPill {
	key: string;
	label: string;
	emoji?: string;
}

interface FilterPillsProps {
	options: FilterPill[];
	selected: string;
	onChange: (key: string) => void;
	accentColor?: string;
}

const activeClasses: Record<string, string> = {
	emerald: "bg-emerald-600 text-white border-emerald-600",
	cyan: "bg-cyan-600 text-white border-cyan-600",
	blue: "bg-blue-600 text-white border-blue-600",
	purple: "bg-purple-600 text-white border-purple-600",
	orange: "bg-orange-600 text-white border-orange-600",
	pink: "bg-pink-600 text-white border-pink-600",
	primary: "bg-primary text-primary-foreground border-primary",
};

export function FilterPills({
	options,
	selected,
	onChange,
	accentColor = "primary",
}: FilterPillsProps) {
	const activeCls = activeClasses[accentColor] ?? activeClasses.primary;

	return (
		<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
			{options.map((opt) => (
				<button
					key={opt.key}
					onClick={() => onChange(opt.key)}
					className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
						selected === opt.key
							? activeCls
							: "bg-card text-muted-foreground border-border hover:border-primary/40"
					}`}
				>
					{opt.emoji && <span>{opt.emoji}</span>} {opt.label}
				</button>
			))}
		</div>
	);
}
