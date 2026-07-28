import { RefreshCw } from "lucide-react";

interface RefreshFooterProps {
	onRefresh: () => void;
	label?: string;
}

export function RefreshFooter({
	onRefresh,
	label = "Actualizar lista",
}: RefreshFooterProps) {
	return (
		<button
			onClick={onRefresh}
			className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
		>
			<RefreshCw className="w-4 h-4" /> {label}
		</button>
	);
}
