import { useEffect, useMemo, useState } from "react";
import { fetchActivityStats } from "@/features/activity";
import { usersService } from "@/entities/user/api/user.service";
import { devLogger } from "@/shared/utils/devLogger";
import type { UserWithProfile } from "../types";
import {
	daysSince,
	getAccessStatus,
	getUserFincas,
	isUserActive,
} from "../utils/user.utils";

type ActivityStats = {
	window?: { days?: number };
	totals?: {
		events?: number;
		distinct_entities?: number;
		distinct_animals?: number;
	};
	by_entity?: Array<{ entity?: string | null; count?: number }>;
	daily?: Array<{ date?: string | null; count?: number }>;
};

const activityEntityLabels: Record<string, string> = {
	control: "Controles",
	controls: "Controles",
	treatment: "Tratamientos",
	treatments: "Tratamientos",
	vaccination: "Vacunaciones",
	vaccinations: "Vacunaciones",
	animal: "Animales",
	animals: "Animales",
	task: "Tareas",
	tasks: "Tareas",
	field: "Potreros",
	fields: "Potreros",
};

const activityEntityColors: Record<string, string> = {
	control: "#10b981",
	controls: "#10b981",
	treatment: "#6366f1",
	treatments: "#6366f1",
	vaccination: "#8b5cf6",
	vaccinations: "#8b5cf6",
	animal: "#0ea5e9",
	animals: "#0ea5e9",
	task: "#f59e0b",
	tasks: "#f59e0b",
	field: "#14b8a6",
	fields: "#14b8a6",
};

const getEntityLabel = (entity?: string | null) => {
	const normalized = String(entity || "otros").toLowerCase();
	return activityEntityLabels[normalized] || normalized.replace(/_/g, " ");
};

const getEntityColor = (entity?: string | null) =>
	activityEntityColors[String(entity || "").toLowerCase()] || "#8b5cf6";

const formatChartDate = (date?: string | null) => {
	if (!date) return "-";
	const parsed = new Date(`${date}T12:00:00`);
	if (Number.isNaN(parsed.getTime())) return date;
	return new Intl.DateTimeFormat("es-CO", {
		day: "2-digit",
		month: "short",
	}).format(parsed);
};

export const useUserDetailPanel = (item: UserWithProfile) => {
	const [activities, setActivities] = useState<any[]>([]);
	const [loadingActivities, setLoadingActivities] = useState(true);
	const [totalActivities, setTotalActivities] = useState(0);
	const [activityPage, setActivityPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);

	const [statsActivities, setStatsActivities] = useState<any[]>([]);
	const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
	const [loadingActivityStats, setLoadingActivityStats] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [activeTab, setActiveTab] = useState<
		"performance" | "history" | "fincas" | "contact"
	>("performance");
	const [historyFilter, setHistoryFilter] = useState<
		"all" | "controls" | "treatments" | "others"
	>("all");

	const activityLimit = 8;

	const fincas = useMemo(() => getUserFincas(item), [item]);
	const accountAgeDays = useMemo(
		() => daysSince(item.created_at),
		[item.created_at],
	);
	const fincaStartDate = useMemo(() => {
		const membershipDates = fincas
			.map((finca) => finca.created_at)
			.filter((date): date is string => Boolean(date));
		return membershipDates.sort()[0] || null;
	}, [fincas]);
	const fincaAgeDays = useMemo(() => daysSince(fincaStartDate), [fincaStartDate]);
	const access = useMemo(
		() => getAccessStatus(item.approval_status),
		[item.approval_status],
	);
	const isActive = useMemo(() => isUserActive(item), [item]);

	// Fetch paginated activities for timeline
	useEffect(() => {
		let active = true;
		const fetchActivity = async () => {
			if (!item.id) return;
			if (activityPage === 1) {
				setLoadingActivities(true);
			}
			try {
				const res = await usersService.getUserActivity(item.id, {
					page: activityPage,
					limit: activityLimit,
				});
				if (active) {
					const newActivities = res.data || [];
					if (activityPage === 1) {
						setActivities(newActivities);
					} else {
						setActivities((prev) => [...prev, ...newActivities]);
					}
					const total = res.total_items ?? newActivities.length;
					setTotalActivities(total);
					setHasMore(activityPage * activityLimit < total);
				}
			} catch (err) {
				devLogger.error("Error fetching user activity:", err);
			} finally {
				if (active) setLoadingActivities(false);
			}
		};

		fetchActivity();
		return () => {
			active = false;
		};
	}, [item.id, activityPage]);

	// Fetch larger dataset for performance statistics
	useEffect(() => {
		let active = true;
		const fetchStatsActivity = async () => {
			if (!item.id) return;
			setLoadingStats(true);
			try {
				const res = await usersService.getUserActivity(item.id, {
					page: 1,
					limit: 150,
				});
				if (active) {
					setStatsActivities(res.data || []);
				}
			} catch (err) {
				devLogger.error("Error fetching stats activity:", err);
			} finally {
				if (active) setLoadingStats(false);
			}
		};

		fetchStatsActivity();
		return () => {
			active = false;
		};
	}, [item.id]);

	// Los conteos del panel se calculan con el endpoint agregado para evitar
	// presentar como totales los primeros 150 eventos de la actividad.
	useEffect(() => {
		let active = true;
		const fetchAggregatedStats = async () => {
			if (!item.id) {
				setLoadingActivityStats(false);
				return;
			}

			setLoadingActivityStats(true);
			setActivityStats(null);
			try {
				const result = await fetchActivityStats({ userId: item.id, days: 30 });
				if (active) setActivityStats((result || null) as ActivityStats | null);
			} catch (err) {
				devLogger.error("Error fetching aggregated user activity stats:", err);
			} finally {
				if (active) setLoadingActivityStats(false);
			}
		};

		void fetchAggregatedStats();
		return () => {
			active = false;
		};
	}, [item.id]);

	const handleLoadMore = () => {
		if (!loadingActivities && hasMore) {
			setActivityPage((prev) => prev + 1);
		}
	};

	const controlsCount = useMemo(
		() =>
			statsActivities.filter((a) => a.entity?.toLowerCase() === "control")
				.length,
		[statsActivities],
	);
	const treatmentsCount = useMemo(
		() =>
			statsActivities.filter((a) =>
				[
					"vaccinations",
					"treatments",
					"vaccination",
					"treatment",
					"medication",
					"injection",
				].includes(a.entity?.toLowerCase()),
			).length,
		[statsActivities],
	);
	const animalsCount = useMemo(
		() =>
			statsActivities.filter((a) => a.entity?.toLowerCase() === "animals")
				.length,
		[statsActivities],
	);
	const tasksCount = useMemo(
		() =>
			statsActivities.filter((a) => a.entity?.toLowerCase() === "tasks").length,
		[statsActivities],
	);
	const otherCount = useMemo(
		() =>
			statsActivities.filter(
				(a) =>
					![
						"control",
						"vaccinations",
						"treatments",
						"vaccination",
						"treatment",
						"medication",
						"injection",
						"animals",
						"tasks",
					].includes(a.entity?.toLowerCase()),
			).length,
		[statsActivities],
	);

	const distributionData = useMemo(() => {
		if (activityStats?.by_entity) {
			return activityStats.by_entity
				.filter((entry) => Number(entry.count) > 0)
				.map((entry) => ({
					name: getEntityLabel(entry.entity),
					cantidad: Number(entry.count),
					fill: getEntityColor(entry.entity),
				}));
		}

		return [
			{ name: "Controles", cantidad: controlsCount, fill: "#10b981" },
			{ name: "Tratamientos", cantidad: treatmentsCount, fill: "#6366f1" },
			{ name: "Animales", cantidad: animalsCount, fill: "#0ea5e9" },
			{ name: "Tareas", cantidad: tasksCount, fill: "#f59e0b" },
			{ name: "Otros", cantidad: otherCount, fill: "#8b5cf6" },
		].filter((x) => x.cantidad > 0);
	}, [
		activityStats,
		animalsCount,
		controlsCount,
		otherCount,
		tasksCount,
		treatmentsCount,
	]);

	const trendData = useMemo(() => {
		if (activityStats?.daily) {
			return activityStats.daily
				.filter((entry) => entry.date && Number(entry.count) > 0)
				.map((entry) => ({
					date: formatChartDate(entry.date),
					acciones: Number(entry.count),
				}))
				.slice(-8);
		}

		const groups: Record<string, number> = {};
		statsActivities.forEach((a) => {
			if (!a.created_at) return;
			const dateStr = a.created_at.split("T")[0];
			groups[dateStr] = (groups[dateStr] || 0) + 1;
		});

		const sortedDates = Object.keys(groups).sort();
		return sortedDates
			.map((dateStr) => {
				const parts = dateStr.split("-");
				const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
				return {
					date: label,
					acciones: groups[dateStr],
				};
			})
			.slice(-8);
	}, [activityStats, statsActivities]);

	const recentEventsCount = activityStats?.totals?.events ?? null;
	const distinctAnimalsCount = activityStats?.totals?.distinct_animals ?? null;
	const activeDaysCount = activityStats?.daily?.filter(
		(entry) => Number(entry.count) > 0,
	).length ?? null;
	const isStatsLoading = loadingStats || loadingActivityStats;

	const filteredActivitiesForTimeline = useMemo(() => {
		return activities.filter((act) => {
			if (historyFilter === "all") return true;
			const entity = act.entity?.toLowerCase();
			if (historyFilter === "controls") return entity === "control";
			if (historyFilter === "treatments") {
				return [
					"vaccinations",
					"treatments",
					"vaccination",
					"treatment",
					"medication",
					"injection",
				].includes(entity);
			}
			if (historyFilter === "others") {
				return ![
					"control",
					"vaccinations",
					"treatments",
					"vaccination",
					"treatment",
					"medication",
					"injection",
				].includes(entity);
			}
			return true;
		});
	}, [activities, historyFilter]);

	return {
		activities,
		loadingActivities,
		totalActivities,
		hasMore,
		loadingStats: isStatsLoading,
		hasRecentStats: Boolean(activityStats),
		recentEventsCount,
		distinctAnimalsCount,
		activeDaysCount,
		recentStatsDays: activityStats?.window?.days ?? 30,
		activeTab,
		setActiveTab,
		historyFilter,
		setHistoryFilter,
		fincas,
		accountAgeDays,
		fincaAgeDays,
		access,
		isActive,
		controlsCount,
		treatmentsCount,
		distributionData,
		trendData,
		filteredActivitiesForTimeline,
		handleLoadMore,
	};
};
