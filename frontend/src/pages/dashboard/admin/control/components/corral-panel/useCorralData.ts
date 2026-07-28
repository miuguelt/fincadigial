import { useCallback, useEffect, useState } from "react";
import { animalService } from "@/entities/animal/api/animal.service";
import { fieldService } from "@/entities/field/api/field.service";
import api from "@/shared/api/client";
import { toast } from "@/shared/hooks/use-toast";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { devLogger } from "@/shared/utils/devLogger";
import type { AnimalOption, CorralHistoryItem, FieldOption } from "./types";

type UnknownRecord = Record<string, unknown>;

interface HistoryResponse {
	success?: boolean;
	data?: CorralHistoryItem[];
}

function asRecord(value: unknown): UnknownRecord | undefined {
	return typeof value === "object" && value !== null
		? (value as UnknownRecord)
		: undefined;
}

function extractItems(value: unknown): UnknownRecord[] {
	if (Array.isArray(value)) {
		return value.map(asRecord).filter((item) => item !== undefined);
	}
	const record = asRecord(value);
	const nested = record?.items ?? record?.data ?? record?.results;
	return Array.isArray(nested)
		? nested.map(asRecord).filter((item) => item !== undefined)
		: [];
}

function animalLabel(animal: UnknownRecord): string {
	const record = animal.record ?? animal.registro;
	const name = animal.name ?? animal.nombre;
	if (record) return `${String(record)}${name ? ` - ${String(name)}` : ""}`;
	return `Animal #${String(animal.id)}`;
}

function animalSex(value: unknown): AnimalOption["sex"] {
	if (value === "Macho" || value === "Hembra") return value;
	return "Desconocido";
}

export function useCorralData() {
	const { isOnline } = useOnlineStatus();
	const [animals, setAnimals] = useState<AnimalOption[]>([]);
	const [fields, setFields] = useState<FieldOption[]>([]);
	const [history, setHistory] = useState<CorralHistoryItem[]>([]);
	const [loadingAnimals, setLoadingAnimals] = useState(true);
	const [loadingFields, setLoadingFields] = useState(true);
	const [loadingHistory, setLoadingHistory] = useState(false);

	const fetchHistory = useCallback(async () => {
		if (!isOnline) return;
		setLoadingHistory(true);
		try {
			const response = await api.get<HistoryResponse>("/api/v1/corral/session");
			if (response.data.success && Array.isArray(response.data.data)) {
				setHistory(response.data.data);
			}
		} catch (error) {
			devLogger.error("Error cargando historial de corral:", error);
		} finally {
			setLoadingHistory(false);
		}
	}, [isOnline]);

	useEffect(() => {
		void fetchHistory();
	}, [fetchHistory]);

	useEffect(() => {
		let active = true;
		const loadFields = async () => {
			try {
				const response = await fieldService.getFields({ limit: 100 });
				const options = extractItems(response).map((field) => ({
					label: String(field.name || `Potrero #${String(field.id)}`),
					value: Number(field.id),
				}));
				if (active) setFields(options);
			} catch (error) {
				devLogger.error("Error cargando potreros:", error);
			} finally {
				if (active) setLoadingFields(false);
			}
		};
		void loadFields();
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		let active = true;
		const loadAnimals = async () => {
			try {
				const response = await animalService.getAll({
					page: 1,
					page_size: 1000,
				});
				const options = extractItems(response).map((animal) => {
					const sex = animalSex(animal.sex);
					return {
						label: `${animalLabel(animal)}${
							sex === "Desconocido" ? " · sexo sin registrar" : ""
						}`,
						value: Number(animal.id),
						sex,
					};
				});
				if (active) setAnimals(options);
			} catch (error) {
				devLogger.error("Error cargando animales:", error);
				toast({
					title: "No se pudieron cargar los animales",
					description: "Revise la conexión e inténtelo de nuevo.",
					variant: "destructive",
				});
			} finally {
				if (active) setLoadingAnimals(false);
			}
		};
		void loadAnimals();
		return () => {
			active = false;
		};
	}, []);

	return {
		animals,
		fields,
		history,
		isOnline,
		loadingAnimals,
		loadingFields,
		loadingHistory,
		fetchHistory,
	};
}
