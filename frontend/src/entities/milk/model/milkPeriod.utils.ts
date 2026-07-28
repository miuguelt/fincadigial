import { getTodayColombia } from "@/shared/utils/dateUtils";

export type MilkDateFilter = "today" | "week" | "month";

export interface MilkDateRange {
	date_from: string;
	date_to: string;
}

function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function getMilkDateRange(
	filter: MilkDateFilter,
	today = getTodayColombia(),
): MilkDateRange {
	const [year, month, day] = today.split("-").map(Number);
	const current = new Date(year, month - 1, day);

	if (filter === "today") return { date_from: today, date_to: today };
	if (filter === "month") {
		return {
			date_from: formatDate(new Date(year, month - 1, 1)),
			date_to: today,
		};
	}

	const mondayOffset = (current.getDay() + 6) % 7;
	current.setDate(current.getDate() - mondayOffset);
	return { date_from: formatDate(current), date_to: today };
}

export function getMilkMonthParts(today = getTodayColombia()): {
	year: number;
	month: number;
} {
	const [year, month] = today.split("-").map(Number);
	return { year, month };
}
