import { useCallback, useEffect, useState } from "react";
import { milkService } from "@/entities/milk/api/milk.service";
import {
	getMilkDateRange,
	getMilkMonthParts,
} from "@/entities/milk/model/milkPeriod.utils";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import type {
	MilkDateFilter,
	MilkPeriodSummary,
	MilkTrendPoint,
} from "./MilkDashboard.types";

function unwrapSummary(value: unknown): MilkPeriodSummary {
	if (!value || typeof value !== "object") return {};
	const envelope = value as { data?: unknown };
	if (envelope.data && typeof envelope.data === "object") {
		return envelope.data as MilkPeriodSummary;
	}
	return value as MilkPeriodSummary;
}

function toNumber(value: unknown): number {
	const result = Number(value);
	return Number.isFinite(result) ? result : 0;
}

function buildTodayTrend(summary: MilkPeriodSummary, date: string): MilkTrendPoint[] {
	const records = toNumber(summary.record_count ?? summary.count);
	const animals = toNumber(summary.animal_count);
	if (!summary.total_liters && !records) return [];
	return [{
		date,
		total_liters: toNumber(summary.total_liters),
		record_count: records,
		animal_count: animals,
	}];
}

export function useMilkDashboardData(
	fincaId: number,
	dateFilter: MilkDateFilter,
) {
	const [summary, setSummary] = useState<MilkPeriodSummary>({});
	const [trendData, setTrendData] = useState<MilkTrendPoint[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		const today = getTodayColombia();
		const range = getMilkDateRange(dateFilter, today);
		try {
			let rawSummary: unknown;
			if (dateFilter === "today") {
				rawSummary = await milkService.getDailySummary(fincaId, today);
			} else if (dateFilter === "week") {
				rawSummary = await milkService.getWeeklySummary(
					fincaId,
					range.date_from,
				);
			} else {
				const { year, month } = getMilkMonthParts(today);
				rawSummary = await milkService.getMonthlySummary(fincaId, year, month);
			}
			const nextSummary = unwrapSummary(rawSummary);
			setSummary(nextSummary);
			setTrendData(
				dateFilter === "today"
					? buildTodayTrend(nextSummary, today)
					: nextSummary.daily_breakdown ?? [],
			);
		} catch {
			setSummary({});
			setTrendData([]);
			setError("No se pudieron cargar las estadísticas de producción.");
		} finally {
			setIsLoading(false);
		}
	}, [dateFilter, fincaId]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	return { summary, trendData, isLoading, error, loadData };
}
