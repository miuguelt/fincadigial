import { Activity, Heart, Map, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import {
	type DashboardStat,
	useCompleteDashboardStats,
} from "@/features/dashboard/model/useCompleteDashboardStats";
import type { QuickModalType } from "@/widgets/dashboard/DashboardQuickModals";

export const getStatValue = (stat?: DashboardStat | number | null) => {
	if (typeof stat === "number") return stat;
	return stat?.valor ?? 0;
};

export const formatLastUpdated = (date: Date | null) => {
	if (!date) return "Sin actualizar";
	return date.toLocaleTimeString("es-CO", {
		hour: "2-digit",
		minute: "2-digit",
	});
};

import { Moon, Sun, Sunrise, Sunset } from "lucide-react";

export const getGreeting = (): {
	text: string;
	Icon: React.ElementType;
	colorClass: string;
} => {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) {
		return { text: "Buenos días", Icon: Sunrise, colorClass: "text-amber-500" };
	} else if (hour >= 12 && hour < 18) {
		return { text: "Buenas tardes", Icon: Sun, colorClass: "text-orange-400" };
	} else if (hour >= 18 && hour < 21) {
		return { text: "Buenas tardes", Icon: Sunset, colorClass: "text-rose-400" };
	} else {
		return { text: "Buenas noches", Icon: Moon, colorClass: "text-indigo-400" };
	}
};

export const useAdminDashboard = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<
		"general" | "operation" | "health"
	>("general");
	const [quickModalType, setQuickModalType] = useState<QuickModalType>(null);

	const { stats, loading, refetch, lastUpdated } =
		useCompleteDashboardStats(true);

	const greeting = useMemo(() => getGreeting(), []);

	const quickActions = useMemo(
		() => [
			{
				label: "Nuevo Animal",
				icon: Heart,
				type: "animal",
				gradientFrom: "from-emerald-500",
				gradientTo: "to-teal-600",
			},
			{
				label: "Nuevo Usuario",
				icon: Users,
				type: "user",
				gradientFrom: "from-indigo-500",
				gradientTo: "to-purple-600",
			},
			{
				label: "Nuevo Potrero",
				icon: Map,
				type: "field",
				gradientFrom: "from-sky-500",
				gradientTo: "to-blue-600",
			},
			{
				label: "Registrar Celo",
				icon: Activity,
				type: "heat",
				gradientFrom: "from-amber-500",
				gradientTo: "to-orange-600",
			},
		],
		[],
	);

	return {
		user,
		navigate,
		activeTab,
		setActiveTab,
		quickModalType,
		setQuickModalType,
		stats,
		loading,
		refetch,
		lastUpdated,
		greeting,
		quickActions,
	};
};
