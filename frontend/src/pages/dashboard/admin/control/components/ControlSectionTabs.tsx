import { ClipboardList, Heart, LayoutDashboard, Milk } from "lucide-react";
import { TabsList, TabsTrigger } from "@/shared/ui/tabs";

const ITEMS = [
	{ value: "today", label: "Lo de hoy", icon: LayoutDashboard },
	{ value: "milk", label: "Ordeños", icon: Milk },
	{ value: "health", label: "Salud y peso", icon: Heart },
	{ value: "corral", label: "Registro completo", icon: ClipboardList },
] as const;

interface ControlSectionTabsProps {
	showCorral: boolean;
}

export function ControlSectionTabs({ showCorral }: ControlSectionTabsProps) {
	const visibleItems = showCorral
		? ITEMS
		: ITEMS.filter((item) => item.value !== "corral");

	return (
		<TabsList
			className={`!grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-2 ${
				showCorral ? "lg:grid-cols-4" : "lg:grid-cols-3"
			}`}
			aria-label="Secciones de trabajo del ganado"
		>
			{visibleItems.map((item) => (
				<TabsTrigger
					key={item.value}
					value={item.value}
					className="min-h-12 min-w-0 !whitespace-normal justify-start gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:justify-center"
				>
					<item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span className="break-words leading-tight">{item.label}</span>
				</TabsTrigger>
			))}
		</TabsList>
	);
}
