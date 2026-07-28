import { useMemo } from "react";
import { analyzeGrowthTrends } from "@/shared/utils/animalMetrics";

interface UseAnimalDerivedStatsParams {
	gender: string | undefined;
	controls: any[];
	fields: any[];
	diseases: any[];
	vaccinations: any[];
	treatments: any[];
	status: any;
	healthIndicator?: string;
}

export function useAnimalDerivedStats({
	gender,
	controls,
	fields,
	diseases,
	vaccinations,
	treatments,
	status,
	healthIndicator,
}: UseAnimalDerivedStatsParams) {
	const sortedControls = useMemo(
		() =>
			[...controls].sort(
				(a, b) =>
					new Date(a.checkup_date).getTime() -
					new Date(b.checkup_date).getTime(),
			),
		[controls],
	);

	const gdpStats = useMemo(() => {
		if (sortedControls.length < 2) return null;
		const first = sortedControls[0];
		const last = sortedControls[sortedControls.length - 1];
		if (!first.weight || !last.weight) return null;
		const weightDiff = last.weight - first.weight;
		const timeDiff =
			new Date(last.checkup_date).getTime() -
			new Date(first.checkup_date).getTime();
		const daysDiff = Math.max(1, timeDiff / (1000 * 60 * 60 * 24));
		return {
			gdp: (weightDiff / daysDiff).toFixed(3),
			weightDiff: weightDiff.toFixed(1),
			daysDiff: Math.round(daysDiff),
		};
	}, [sortedControls]);

	const activeFieldAssignment = useMemo(
		() => fields.find((f: any) => !f.removal_date),
		[fields],
	);

	const daysInCurrentField = useMemo(() => {
		if (!activeFieldAssignment?.assignment_date) return null;
		const days = Math.floor(
			(Date.now() - new Date(activeFieldAssignment.assignment_date).getTime()) /
				(1000 * 60 * 60 * 24),
		);
		return Math.max(0, days);
	}, [activeFieldAssignment]);

	const totalRotations = fields.length;
	const activeDiseasesCount = useMemo(
		() => diseases.filter((d: any) => d.status === "Activo").length,
		[diseases],
	);
	const curedDiseasesCount = useMemo(
		() => diseases.filter((d: any) => d.status === "Curado").length,
		[diseases],
	);
	const totalVaccinations = vaccinations.length;
	const totalTreatments = treatments.length;

	const healthLabel = useMemo(() => {
		if (healthIndicator === "critical") return "Crítico";
		if (healthIndicator === "warning" || (status as any) === "Enfermo")
			return "Atención";
		return "Estable";
	}, [healthIndicator, status]);

	const healthTone = useMemo(() => {
		if (healthLabel === "Crítico")
			return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 animate-pulse";
		if (healthLabel === "Atención")
			return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 animate-pulse";
		return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
	}, [healthLabel]);

	const sexTone = useMemo(() => {
		if (gender === "Macho")
			return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300";
		if (gender === "Hembra")
			return "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/30 dark:text-pink-300";
		return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
	}, [gender]);

	const heroGradient = useMemo(() => {
		if (gender === "Macho")
			return "from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20";
		if (gender === "Hembra")
			return "from-pink-500/10 via-purple-500/5 to-transparent border-pink-500/20";
		return "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20";
	}, [gender]);

	const healthAlerts = useMemo(
		() =>
			controls.length >= 2
				? analyzeGrowthTrends(
						controls.map((c) => ({
							date: c.checkup_date,
							weight: c.weight,
							height: c.height,
						})),
					)
				: [],
		[controls],
	);

	return {
		gdpStats,
		activeFieldAssignment,
		daysInCurrentField,
		totalRotations,
		activeDiseasesCount,
		curedDiseasesCount,
		totalVaccinations,
		totalTreatments,
		healthLabel,
		healthTone,
		sexTone,
		heroGradient,
		healthAlerts,
	};
}
