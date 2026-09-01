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

export function formatAnimalHeight(value: number | string | null | undefined): string {
	if (value === null || value === undefined || value === '') return '-';
	const num = Number(value);
	if (Number.isNaN(num) || num <= 0) return '-';

	// Si el valor es menor a 3, está expresado en metros (ej. 1.35m) -> convertir a cm
	if (num < 3) {
		const inCm = Math.round(num * 100);
		return `${inCm} cm`;
	}

	// Si es entero o decimal
	return Number.isInteger(num) ? `${num} cm` : `${num.toFixed(1)} cm`;
}
