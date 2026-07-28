import { useMemo } from "react";
import { AnimalLink } from "@/entities/animal/ui";
import type { ControlResponse } from "@/shared/api/generated/swaggerTypes";
import type { CRUDColumn } from "@/shared/types/crud";
import { formatLongDateColombia } from "@/shared/utils/dateUtils";
import type { ControlOption } from "../controlPage.types";

type ControlRow = ControlResponse & Record<string, unknown>;

export function useControlColumns(
	animalOptions: ControlOption[],
): CRUDColumn<ControlRow>[] {
	const animalMap = useMemo(
		() => new Map(animalOptions.map((option) => [option.value, option.label])),
		[animalOptions],
	);

	return useMemo(
		() => [
			{
				key: "animal_id",
				label: "Animal",
				render: (value: unknown) =>
					value ? (
						<AnimalLink
							id={Number(value)}
							label={animalMap.get(Number(value)) ?? `Animal ${value}`}
						/>
					) : (
						"—"
					),
			},
			{
				key: "checkup_date",
				label: "Fecha",
				render: (_value: unknown, item: ControlRow) => {
					const date = item.checkup_date ?? item.control_date;
					return date ? formatLongDateColombia(String(date)) : "—";
				},
			},
			{
				key: "weight",
				label: "Peso",
				render: (value: unknown) =>
					value != null ? `${Number(value).toFixed(1)} kg` : "—",
			},
			{
				key: "height",
				label: "Altura",
				render: (value: unknown) =>
					value != null ? `${Number(value).toFixed(1)} m` : "—",
			},
			{
				key: "health_status",
				label: "Cómo estaba",
				render: (_value: unknown, item: ControlRow) => {
					const status = item.health_status ?? item.healt_status;
					return status ? String(status) : "Sin dato";
				},
			},
			{
				key: "description",
				label: "Nota",
				render: (_value: unknown, item: ControlRow) => {
					const description = item.description ?? item.observations;
					return description ? String(description) : "—";
				},
			},
		],
		[animalMap],
	);
}
