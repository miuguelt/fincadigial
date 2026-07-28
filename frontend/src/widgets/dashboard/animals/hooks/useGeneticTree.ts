import React from "react";
import { animalsService } from "@/entities/animal/api/animal.service";
import { devLogger } from "@/shared/utils/devLogger";

interface AnimalNode {
	animal_id?: number;
	id?: number;
	record?: string;
	name?: string;
	birth_date?: string;
	sex?: string;
	gender?: string;
	breed?: any;
	father_id?: number | null;
	mother_id?: number | null;
}

interface CoupleGroup {
	father?: any;
	mother?: any;
	children?: number[];
}

interface UseGeneticTreeOptions {
	animal: AnimalNode | null;
	levels: AnimalNode[][];
	onNavigateToAnimal?: (animal: any) => void;
	onOpenDescendantsTreeForAnimal?: (animal: any) => void;
}

export function useGeneticTree({
	animal,
	levels,
	onNavigateToAnimal: _onNavigateToAnimal,
	onOpenDescendantsTreeForAnimal: _onOpenDescendantsTreeForAnimal,
}: UseGeneticTreeOptions) {
	const [lineageMode, setLineageMode] = React.useState<
		"ambos" | "paterna" | "materna"
	>("ambos");
	const [depthShown, setDepthShown] = React.useState<number>(
		Math.max(1, levels?.length ?? 1),
	);

	const [animalDetailStack, setAnimalDetailStack] = React.useState<{id: number; data: any}[]>([]);
	const isDetailModalOpen = animalDetailStack.length > 0;
	const detailAnimal = animalDetailStack.length > 0 ? animalDetailStack[animalDetailStack.length - 1].data : null;
	
	const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
	const [historyAnimal, setHistoryAnimal] = React.useState<any | null>(null);

	React.useEffect(() => {
		const total = Array.isArray(levels) ? levels.length : 1;
		setDepthShown(Math.max(1, total));
	}, [levels]);

	const openAnimalDetail = async (clickedAnimal: AnimalNode) => {
		const id = getId(clickedAnimal);
		if (!id) return;
		
		setAnimalDetailStack((prev) => [...prev, { id, data: clickedAnimal }]);
		try {
			const full = await animalsService.getAnimalById(id);
			setAnimalDetailStack((prev) => {
				const nextStack = [...prev];
				const idx = nextStack.findIndex((i) => i.id === id);
				if (idx >= 0) {
					nextStack[idx] = { ...nextStack[idx], data: full };
				}
				return nextStack;
			});
		} catch (error) {
			devLogger.error("Error loading animal details:", error);
		}
	};

	const closeTopAnimalDetail = () => {
		setAnimalDetailStack((prev) => prev.slice(0, -1));
	};

	const closeAllAnimalDetails = () => {
		setAnimalDetailStack([]);
	};

	const openAnimalDetailById = (id: number) => {
		void openAnimalDetail({ id });
	};

	const openHistory = (record: any) => {
		const payload = {
			idAnimal: Number(
				record?.id ?? record?.idAnimal ?? record?.animal_id ?? 0,
			),
			record: record?.record || "",
			breed: record?.breed,
			birth_date: record?.birth_date,
			sex: record?.sex || record?.gender,
			status: record?.status,
		};
		setHistoryAnimal(payload);
		setIsHistoryOpen(true);
	};

	const getId = (n: any): number | undefined => {
		const id = n?.id ?? n?.idAnimal ?? n?.animal_id;
		return id && Number.isInteger(Number(id)) && Number(id) > 0
			? Number(id)
			: undefined;
	};

	const getFatherId = (n: any): number | undefined => {
		const fId =
			n?.idFather ?? n?.father_id ?? n?.father?.id ?? n?.father?.idAnimal;
		return fId && Number.isInteger(Number(fId)) && Number(fId) > 0
			? Number(fId)
			: undefined;
	};

	const getMotherId = (n: any): number | undefined => {
		const mId =
			n?.idMother ?? n?.mother_id ?? n?.mother?.id ?? n?.mother?.idAnimal;
		return mId && Number.isInteger(Number(mId)) && Number(mId) > 0
			? Number(mId)
			: undefined;
	};

	const getBreedLabel = (record: any) => {
		if (!record) return "-";
		return (
			record?.breed?.name ||
			record?.breed_name ||
			(record?.breeds_id || record?.breed_id
				? `ID ${record.breeds_id ?? record.breed_id}`
				: "-")
		);
	};

	const getParentLabel = (parent: any, parentId?: number) => {
		if (parent?.record) return parent.record;
		if (parent?.name) return parent.name;
		return parentId ? `ID ${parentId}` : "-";
	};

	const detailFatherId = detailAnimal ? getFatherId(detailAnimal) : undefined;
	const detailMotherId = detailAnimal ? getMotherId(detailAnimal) : undefined;
	const detailBreedLabel = getBreedLabel(detailAnimal);
	const detailFatherLabel = getParentLabel(
		detailAnimal?.father,
		detailFatherId,
	);
	const detailMotherLabel = getParentLabel(
		detailAnimal?.mother,
		detailMotherId,
	);

	const displayLevels: any[][] = React.useMemo(() => {
		if (!animal || !levels) return [];
		const limited = Array.isArray(levels)
			? levels.slice(0, Math.max(1, depthShown))
			: [];

		const sorted = limited.map((level, idx) => {
			if (idx === 0 || level.length <= 1) return level;

			const fathers = level.filter((a: any) => {
				const sex = a?.sex ?? a?.gender;
				return sex === "Macho";
			});
			const mothers = level.filter((a: any) => {
				const sex = a?.sex ?? a?.gender;
				return sex === "Hembra";
			});
			const unknown = level.filter((a: any) => {
				const sex = a?.sex ?? a?.gender;
				return sex !== "Macho" && sex !== "Hembra";
			});

			return [...fathers, ...mothers, ...unknown];
		});

		if (lineageMode === "ambos") return sorted;
		if (!sorted || sorted.length === 0) return [];

		const root = sorted[0]?.[0];
		if (!root) return sorted;

		const chain: any[] = [root];
		for (let li = 1; li < sorted.length; li++) {
			const prev = chain[li - 1];
			const expectedId =
				lineageMode === "paterna" ? getFatherId(prev) : getMotherId(prev);
			if (!expectedId) break;
			const candidate = (sorted[li] || []).find(
				(n: any) => getId(n) === expectedId,
			);
			if (!candidate) break;
			chain.push(candidate);
		}
		const filtered: any[][] = [];
		for (let i = 0; i < chain.length; i++) filtered.push([chain[i]]);
		return filtered;
	}, [animal, levels, depthShown, lineageMode]);

	const groupedLevels: CoupleGroup[][] = React.useMemo(() => {
		if (lineageMode !== "ambos") return [];

		return displayLevels.map((level, levelIndex) => {
			if (levelIndex === 0) return [{ father: level[0] }];

			const couples: CoupleGroup[] = [];
			const processed = new Set<number>();

			const prevLevel = displayLevels[levelIndex - 1] || [];

			prevLevel.forEach((child: any) => {
				const fatherId = getFatherId(child);
				const motherId = getMotherId(child);
				const childId = getId(child);

				const father = level.find((a: any) => getId(a) === fatherId);
				const mother = level.find((a: any) => getId(a) === motherId);

				if (father || mother) {
					const existingCouple = couples.find(
						(c) =>
							(father && c.father && getId(c.father) === getId(father)) ||
							(mother && c.mother && getId(c.mother) === getId(mother)),
					);

					if (existingCouple) {
						if (childId) {
							if (!existingCouple.children) existingCouple.children = [];
							if (!existingCouple.children.includes(childId)) {
								existingCouple.children.push(childId);
							}
						}
						if (father && !existingCouple.father)
							existingCouple.father = father;
						if (mother && !existingCouple.mother)
							existingCouple.mother = mother;
					} else {
						couples.push({
							father,
							mother,
							children: childId ? [childId] : [],
						});
					}

					if (father) processed.add(getId(father)!);
					if (mother) processed.add(getId(mother)!);
				}
			});

			level.forEach((a: any) => {
				const id = getId(a);
				if (id && !processed.has(id)) {
					const sex = a?.sex ?? a?.gender;
					couples.push({
						[sex === "Macho"
							? "father"
							: sex === "Hembra"
								? "mother"
								: "father"]: a,
					});
				}
			});

			return couples;
		});
	}, [displayLevels, lineageMode]);

	const getGenerationLabel = (levelIndex: number) => {
		switch (levelIndex) {
			case 0:
				return null;
			case 1:
				return "Padres";
			case 2:
				return "Abuelos";
			case 3:
				return "Bisabuelos";
			case 4:
				return "Tatarabuelos";
			case 5:
				return "Trastatarabuelos";
			default:
				return `Generación ${levelIndex}`;
		}
	};

	return {
		lineageMode,
		depthShown,
		detailAnimal,
		isDetailModalOpen,
		isHistoryOpen,
		historyAnimal,
		displayLevels,
		groupedLevels,
		detailFatherId,
		detailMotherId,
		detailBreedLabel,
		detailFatherLabel,
		detailMotherLabel,
		animalDetailStack,
		setLineageMode,
		setDepthShown,
		setIsHistoryOpen,
		setHistoryAnimal,
		openAnimalDetail,
		openAnimalDetailById,
		closeTopAnimalDetail,
		closeAllAnimalDetails,
		openHistory,
		getId,
		getFatherId,
		getMotherId,
		getBreedLabel,
		getParentLabel,
		getGenerationLabel,
	};
}
