import { useQuery } from "@tanstack/react-query";
import {
	Book,
	CalendarDays,
	CheckSquare,
	CloudAlert,
	Droplet,
	Headset,
	ShoppingBag,
	Sprout,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { useMultiFinca } from "@/features/multi-finca/model/useMultiFinca";
import { apiClient, unwrapApi } from "@/shared/api/client";
import {
	IconHealthAlert,
	IconHealthCheck,
	IconMilk,
	IconTag,
} from "@/shared/icons/cattle";
import { IconClipboardList } from "@/shared/ui/icons";

const OFFLINE_STORAGE_KEY = "campesino:pending_sync";

export interface QuickActionItem {
	id: string;
	label: string;
	sublabel: string;
	icon: React.ComponentType<any>;
	path: string;
	color: string;
	glow: string;
	requiresOnline: boolean;
}

export interface ToolItem {
	id: string;
	title: string;
	description: string;
	icon: React.ComponentType<any>;
	path: string;
	bg: string;
	emoji: string;
	requiresOnline: boolean;
}

export interface ToolGroup {
	title: string;
	color: string;
	border: string;
	tools: ToolItem[];
}

export const QUICK_ACTIONS: QuickActionItem[] = [
	{
		id: "new-milk",
		label: "Registrar Ordeño",
		sublabel: "Producción de leche",
		icon: IconMilk as React.ComponentType<any>,
		path: "/campesino/registro-operativo?modal=milk",
		color: "from-amber-500 to-orange-500",
		glow: "shadow-amber-200 dark:shadow-amber-900",
		requiresOnline: false,
	},
	{
		id: "health-alert",
		label: "Reportar Enfermedad",
		sublabel: "Animal enfermo",
		icon: IconHealthAlert as React.ComponentType<any>,
		path: "/campesino/registro-operativo?modal=disease",
		color: "from-rose-500 to-red-600",
		glow: "shadow-rose-200 dark:shadow-rose-900",
		requiresOnline: false,
	},
	{
		id: "scan-animal",
		label: "Escanear Animal",
		sublabel: "Leer chapeta",
		icon: IconTag as React.ComponentType<any>,
		path: "/scanner",
		color: "from-indigo-500 to-blue-600",
		glow: "shadow-indigo-200 dark:shadow-indigo-900",
		requiresOnline: false,
	},
];

export const TOOL_GROUPS: ToolGroup[] = [
	{
		title: "🐄 Mi Ganadería",
		color: "text-amber-700 dark:text-amber-300",
		border: "border-amber-200 dark:border-amber-800/40",
		tools: [
			{
				id: "ganaderia",
				title: "Ganadería Operativa",
				description: "Ordeños, traslados, tratamientos",
				icon: IconClipboardList as React.ComponentType<any>,
				path: "/campesino/ganaderia",
				bg: "bg-gradient-to-br from-amber-50/70 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700",
				emoji: "🐄",
				requiresOnline: false,
			},
			{
				id: "health",
				title: "Salud del Ganado",
				description: "Alertas y controles sanitarios",
				icon: IconHealthCheck as React.ComponentType<any>,
				path: "/campesino/health",
				bg: "bg-gradient-to-br from-rose-50/70 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10 border-rose-200/60 dark:border-rose-800/40 hover:border-rose-300 dark:hover:border-rose-700",
				emoji: "⚕️",
				requiresOnline: false,
			},
			{
				id: "scanner",
				title: "Escanear Chapeta",
				description: "Identificar animal por orejera",
				icon: IconTag as React.ComponentType<any>,
				path: "/scanner",
				bg: "bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700",
				emoji: "🏷️",
				requiresOnline: false,
			},
		],
	},
	{
		title: "🌱 Mis Cultivos",
		color: "text-green-700 dark:text-green-300",
		border: "border-green-200 dark:border-green-800/40",
		tools: [
			{
				id: "plots",
				title: "Parcelas y Cultivos",
				description: "Ver y manejar lotes de cultivo",
				icon: Sprout as React.ComponentType<any>,
				path: "/campesino/crop-plots",
				bg: "bg-gradient-to-br from-green-50/70 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700",
				emoji: "🌱",
				requiresOnline: false,
			},
			{
				id: "activities",
				title: "Bitácora de Labores",
				description: "Historial de actividades agrícolas",
				icon: IconClipboardList as React.ComponentType<any>,
				path: "/campesino/crop-activities",
				bg: "bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700",
				emoji: "📋",
				requiresOnline: false,
			},
			{
				id: "registro-operativo",
				title: "Registrar Labor",
				description: "Nueva actividad agrícola o ganadera",
				icon: IconClipboardList as React.ComponentType<any>,
				path: "/campesino/registro-operativo",
				bg: "bg-gradient-to-br from-lime-50/70 to-lime-100/30 dark:from-lime-950/20 dark:to-lime-900/10 border-lime-200/60 dark:border-lime-800/40 hover:border-lime-300 dark:hover:border-lime-700",
				emoji: "✏️",
				requiresOnline: false,
			},
		],
	},
	{
		title: "🌤️ Clima y Agua",
		color: "text-sky-700 dark:text-sky-300",
		border: "border-sky-200 dark:border-sky-800/40",
		tools: [
			{
				id: "weather",
				title: "Clima Actual",
				description: "Temperatura, humedad, viento",
				icon: CloudAlert as React.ComponentType<any>,
				path: "/campesino/weather",
				bg: "bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/20 dark:to-sky-900/10 border-sky-200/60 dark:border-sky-800/40 hover:border-sky-300 dark:hover:border-sky-700",
				emoji: "🌤️",
				requiresOnline: true,
			},
			{
				id: "climate-alerts",
				title: "Alertas Climáticas",
				description: "Heladas, sequías y avisos",
				icon: CloudAlert as React.ComponentType<any>,
				path: "/campesino/climate-alerts",
				bg: "bg-gradient-to-br from-orange-50/70 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/60 dark:border-orange-800/40 hover:border-orange-300 dark:hover:border-orange-700",
				emoji: "⛈️",
				requiresOnline: true,
			},
			{
				id: "water",
				title: "Fuentes de Agua",
				description: "Quebradas, pozos, reservorios",
				icon: Droplet as React.ComponentType<any>,
				path: "/campesino/water-sources",
				bg: "bg-gradient-to-br from-cyan-50/70 to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10 border-cyan-200/60 dark:border-cyan-800/40 hover:border-cyan-300 dark:hover:border-cyan-700",
				emoji: "💧",
				requiresOnline: false,
			},
		],
	},
	{
		title: "🤝 Servicios y Apoyo",
		color: "text-purple-700 dark:text-purple-300",
		border: "border-purple-200 dark:border-purple-800/40",
		tools: [
			{
				id: "calendar",
				title: "Calendario",
				description: "Partos, vacunas y tareas del mes",
				icon: CalendarDays as React.ComponentType<any>,
				path: "/campesino/calendario",
				bg: "bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700",
				emoji: "📅",
				requiresOnline: false,
			},
			{
				id: "tasks",
				title: "Mis Tareas",
				description: "Ver qué tengo asignado hoy",
				icon: CheckSquare as React.ComponentType<any>,
				path: "/campesino/tasks",
				bg: "bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/20 dark:to-sky-900/10 border-sky-200/60 dark:border-sky-800/40 hover:border-sky-300 dark:hover:border-sky-700",
				emoji: "📅",
				requiresOnline: false,
			},
			{
				id: "market",
				title: "Mercado Campesino",
				description: "Vender o comprar productos",
				icon: ShoppingBag as React.ComponentType<any>,
				path: "/campesino/market-offers",
				bg: "bg-gradient-to-br from-fuchsia-50/70 to-fuchsia-100/30 dark:from-fuchsia-950/20 dark:to-fuchsia-900/10 border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
				emoji: "🏪",
				requiresOnline: true,
			},
			{
				id: "assistance",
				title: "Ayuda Técnica",
				description: "Solicitar asesoría",
				icon: Headset as React.ComponentType<any>,
				path: "/campesino/technical-assistance",
				bg: "bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700",
				emoji: "👨‍🌾",
				requiresOnline: true,
			},
			{
				id: "learning",
				title: "Aprendizaje Offline",
				description: "Biblioteca y guías descargables",
				icon: Book as React.ComponentType<any>,
				path: "/campesino/learning",
				bg: "bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700",
				emoji: "📚",
				requiresOnline: false,
			},
		],
	},
];

export const getGreeting = (): string => {
	const hour = new Date().getHours();
	if (hour < 12) return "¡Buenos días!";
	if (hour < 18) return "¡Buenas tardes!";
	return "¡Buenas noches!";
};

export const getTodayStr = (): string => {
	return new Date().toLocaleDateString("es-CO", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
};

export const useCampesinoDashboard = () => {
	const navigate = useNavigate();
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [pendingCount, setPendingCount] = useState(0);
	const [tips, setTips] = useState<any[]>([]);
	const [tipIdx, setTipIdx] = useState(0);
	const [searchTerm, setSearchTerm] = useState("");

	const { switchFinca, switching } = useMultiFinca();
	const { user } = useAuth();

	const { data: fincas, isLoading: loadingFincas } = useQuery<any[]>({
		queryKey: ["multi_finca_compare_campesino"],
		queryFn: async () => {
			const res = await apiClient.get("/multi-finca/compare-kpis");
			return unwrapApi(res);
		},
		enabled: isOnline,
	});

	useEffect(() => {
		const updateOnline = () => setIsOnline(navigator.onLine);
		window.addEventListener("online", updateOnline);
		window.addEventListener("offline", updateOnline);

		apiClient
			.get("/intelligence/tips")
			.then((res) => {
				const data = unwrapApi(res);
				if (Array.isArray(data) && data.length > 0) {
					setTips(data);
					setTipIdx(Math.floor(Math.random() * data.length));
				}
			})
			.catch(() => {});

		return () => {
			window.removeEventListener("online", updateOnline);
			window.removeEventListener("offline", updateOnline);
		};
	}, []);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
			if (stored) {
				const items = JSON.parse(stored);
				setPendingCount(Array.isArray(items) ? items.length : 0);
			}
		} catch {
			/* ignore */
		}
	}, []);

	const filteredGroups = useMemo(() => {
		if (!searchTerm.trim()) return TOOL_GROUPS;
		const term = searchTerm.toLowerCase().trim();
		return TOOL_GROUPS.map((group) => {
			const matchingTools = group.tools.filter(
				(tool) =>
					tool.title.toLowerCase().includes(term) ||
					tool.description.toLowerCase().includes(term) ||
					(tool.emoji && tool.emoji.includes(term)),
			);
			return { ...group, tools: matchingTools };
		}).filter((group) => group.tools.length > 0);
	}, [searchTerm]);

	const tip = tips.length > 0 ? tips[tipIdx % tips.length] : null;

	return {
		navigate,
		isOnline,
		pendingCount,
		searchTerm,
		setSearchTerm,
		switchFinca,
		switching,
		user,
		fincas,
		loadingFincas,
		filteredGroups,
		tip,
	};
};
