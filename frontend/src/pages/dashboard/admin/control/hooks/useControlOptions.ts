import { useCallback, useEffect, useState } from "react";
import { animalsService } from "@/entities/animal/api/animal.service";
import { fieldService } from "@/entities/field/api/field.service";
import type { ControlOption } from "../controlPage.types";

export interface ControlOptionsState {
	animalOptions: ControlOption[];
	fieldOptions: ControlOption[];
	loadingAnimals: boolean;
	loadingFields: boolean;
	animalError: boolean;
	fieldError: boolean;
	reload: () => void;
}

export function useControlOptions(): ControlOptionsState {
	const [animalOptions, setAnimalOptions] = useState<ControlOption[]>([]);
	const [fieldOptions, setFieldOptions] = useState<ControlOption[]>([]);
	const [loadingAnimals, setLoadingAnimals] = useState(true);
	const [loadingFields, setLoadingFields] = useState(true);
	const [animalError, setAnimalError] = useState(false);
	const [fieldError, setFieldError] = useState(false);

	const reload = useCallback(() => {
		setLoadingAnimals(true);
		setLoadingFields(true);
		setAnimalError(false);
		setFieldError(false);

		void animalsService
			.getAnimals({ limit: 1000, status: "Vivo" })
			.then((animals) =>
				setAnimalOptions(
					animals.map((animal) => {
						const record = animal.record || `#${animal.id}`;
						const name = animal.name;
						return {
							value: Number(animal.id),
							label: name ? `${record} · ${name}` : String(record),
						};
					}),
				),
			)
			.catch(() => {
				setAnimalOptions([]);
				setAnimalError(true);
			})
			.finally(() => setLoadingAnimals(false));

		void fieldService
			.getFields({ limit: 500 })
			.then((raw) =>
				setFieldOptions(
					raw.data.map((field) => ({
						value: Number(field.id),
						label: field.name || `Potrero ${field.id}`,
					})),
				),
			)
			.catch(() => {
				setFieldOptions([]);
				setFieldError(true);
			})
			.finally(() => setLoadingFields(false));
	}, []);

	useEffect(() => reload(), [reload]);

	return {
		animalOptions,
		fieldOptions,
		loadingAnimals,
		loadingFields,
		animalError,
		fieldError,
		reload,
	};
}
