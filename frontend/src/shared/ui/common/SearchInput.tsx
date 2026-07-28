import { Search } from "lucide-react";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	accentColor?: string;
}

const accentRing: Record<string, string> = {
	emerald: "focus:ring-emerald-500/30",
	cyan: "focus:ring-cyan-500/30",
	blue: "focus:ring-blue-500/30",
	purple: "focus:ring-purple-500/30",
	orange: "focus:ring-orange-500/30",
	primary: "focus:ring-primary/30",
};

export function SearchInput({
	value,
	onChange,
	placeholder = "Buscar...",
	accentColor = "primary",
}: SearchInputProps) {
	const ring = accentRing[accentColor] ?? accentRing.primary;

	return (
		<div className="relative">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
			<input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={`w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 ${ring}`}
			/>
		</div>
	);
}
