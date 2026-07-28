import { useEffect, useMemo, useState } from "react";
import { usersService } from "@/entities/user/api/user.service";
import { devLogger } from "@/shared/utils/devLogger";
import type { UserWithProfile } from "../types";
import { daysSince, getAccessStatus, getUserFincas } from "../utils/user.utils";

export const useUserDetailPanel = (item: UserWithProfile) => {
	const [activities, setActivities] = useState<any[]>([]);
	const [loadingActivities, setLoadingActivities] = useState(true);
	const [totalActivities, setTotalActivities] = useState(0);
	const [activityPage, setActivityPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);

	const [statsActivities, setStatsActivities] = useState<any[]>([]);
	const [loadingStats, setLoadingStats] = useState(true);
	const [activeTab, setActiveTab] = useState<
		"performance" | "history" | "fincas" | "contact"
	>("performance");
	const [historyFilter, setHistoryFilter] = useState<
		"all" | "controls" | "treatments" | "others"
	>("all");

	const activityLimit = 8;

	const fincas = useMemo(() => getUserFincas(item), [item]);
	const linkedDays = useMemo(
		() => daysSince(item.created_at),
		[item.created_at],
	);
	const access = useMemo(
		() => getAccessStatus(item.approval_status),
		[item.approval_status],
	);
	const isActive = useMemo(
		() =>
			typeof item.status === "boolean" ? item.status : item.status === "1",
		[item.status],
	);

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
					const total = res.total_items || 0;
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

	const distributionData = useMemo(
		() =>
			[
				{ name: "Controles", cantidad: controlsCount, fill: "#10b981" },
				{ name: "Tratamientos", cantidad: treatmentsCount, fill: "#6366f1" },
				{ name: "Animales", cantidad: animalsCount, fill: "#0ea5e9" },
				{ name: "Tareas", cantidad: tasksCount, fill: "#f59e0b" },
				{ name: "Otros", cantidad: otherCount, fill: "#8b5cf6" },
			].filter((x) => x.cantidad > 0),
		[controlsCount, treatmentsCount, animalsCount, tasksCount, otherCount],
	);

	const trendData = useMemo(() => {
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
	}, [statsActivities]);

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
		loadingStats,
		activeTab,
		setActiveTab,
		historyFilter,
		setHistoryFilter,
		fincas,
		linkedDays,
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
