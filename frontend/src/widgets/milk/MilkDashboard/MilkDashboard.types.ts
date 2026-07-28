import type { ReactNode } from "react";
import type { MilkDateFilter } from "@/entities/milk/model/milkPeriod.utils";

export type { MilkDateFilter };

export interface MilkTrendPoint {
	date: string;
	total_liters: number;
	record_count: number;
	animal_count: number;
}

export interface MilkPeriodSummary {
	total_liters?: number;
	avg_daily_liters?: number;
	count?: number;
	record_count?: number;
	animal_count?: number;
	days_with_records?: number;
	daily_breakdown?: MilkTrendPoint[];
	trend_vs_previous_month?: {
		previous_month_liters?: number;
		change_percentage?: number;
		direction?: "up" | "down" | "stable";
	};
}

export interface MilkDashboardProps {
	fincaId: number;
	tableComponent?: ReactNode;
	dateFilter?: MilkDateFilter;
	onDateFilterChange?: (filter: MilkDateFilter) => void;
	embedded?: boolean;
}
