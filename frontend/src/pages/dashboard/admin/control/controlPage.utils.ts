export function parseDateOnlyLocal(value: string): Date | null {
	const [year, month, day] = value.split("T")[0].split("-").map(Number);
	if (!year || !month || !day) return null;

	const date = new Date(year, month - 1, day);
	if (
		Number.isNaN(date.getTime()) ||
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}
	return date;
}

export function formatControlPageDate(value: string): string {
	const date = parseDateOnlyLocal(value);
	if (!date) return "Fecha no disponible";

	const formatted = new Intl.DateTimeFormat("es-CO", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);

	return `Hoy, ${formatted}`;
}
