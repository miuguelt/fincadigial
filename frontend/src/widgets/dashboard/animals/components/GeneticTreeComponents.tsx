import { Heart, Printer, Users } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/ui/cn";
import { AnimalMiniCard } from "@/widgets/dashboard/AnimalMiniCard";

interface GenerationBadgeProps {
	label: string | null;
	countLabel?: string;
}

export const GenerationBadge: React.FC<GenerationBadgeProps> = ({
	label,
	countLabel,
}) => {
	if (!label) return null;

	return (
		<div className="relative mb-6">
			<div
				className={cn(
					"px-6 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm",
					"border-2 transition-all duration-300",
					"bg-gradient-to-r from-card/80 to-muted/60 text-foreground border-border/50",
				)}
			>
				<span>{label}</span>
				{countLabel && (
					<span className="ml-2 text-xs text-muted-foreground font-normal">
						{countLabel}
					</span>
				)}
			</div>
		</div>
	);
};

interface CoupleGroupCardProps {
	couple: { father?: any; mother?: any; children?: number[] };
	levelIndex: number;
	onOpenDetail: (animal: any) => void;
}

export const CoupleGroupCard: React.FC<CoupleGroupCardProps> = ({
	couple,
	levelIndex,
	onOpenDetail,
}) => (
	<div className="flex flex-col items-center">
		{levelIndex > 0 && (
			<div className="w-1 h-6 bg-gradient-to-b from-primary/30 to-transparent rounded-full mb-3" />
		)}

		<div
			className={cn(
				"relative p-4 rounded-lg border-2 backdrop-blur-sm",
				"transition-all duration-300 hover:shadow-xl",
				"bg-gradient-to-br from-background/80 to-muted/40",
				"border-border/30 hover:border-primary/30",
			)}
		>
			{couple.father && couple.mother && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
					<div className="bg-pink-500 text-white rounded-full p-1.5 shadow-lg">
						<Heart className="h-4 w-4 fill-current" />
					</div>
				</div>
			)}

			<div
				className={cn(
					"flex gap-4",
					couple.father && couple.mother
						? "flex-row items-start justify-center"
						: "flex-col items-center",
				)}
			>
				{couple.father && (
					<div className="flex flex-col items-center">
						<AnimalMiniCard
							animal={couple.father}
							role="Padre"
							levelIndex={levelIndex}
							onClick={() => onOpenDetail(couple.father)}
							className="mb-2"
						/>
					</div>
				)}

				{couple.mother && (
					<div className="flex flex-col items-center">
						<AnimalMiniCard
							animal={couple.mother}
							role="Madre"
							levelIndex={levelIndex}
							onClick={() => onOpenDetail(couple.mother)}
							className="mb-2"
						/>
					</div>
				)}
			</div>
		</div>

		{levelIndex > 0 && (
			<div className="w-1 h-6 bg-gradient-to-b from-transparent to-primary/20 rounded-full mt-4" />
		)}
	</div>
);

interface SingleAncestorCardProps {
	ancestor: any;
	levelIndex: number;
	ancestorIndex: number;
	onOpenDetail: (animal: any) => void;
	getId: (n: any) => number | undefined;
}

export const SingleAncestorCard: React.FC<SingleAncestorCardProps> = ({
	ancestor,
	levelIndex,
	ancestorIndex,
	onOpenDetail,
	getId,
}) => {
	const role =
		ancestor.sex === "Macho"
			? "Padre"
			: ancestor.sex === "Hembra"
				? "Madre"
				: null;

	return (
		<div
			key={getId(ancestor) ?? `lvl-${levelIndex}-idx-${ancestorIndex}`}
			id={getId(ancestor) ? `node-${getId(ancestor)}` : undefined}
			className="relative flex flex-col items-center"
		>
			{levelIndex > 0 && (
				<div className="w-1 h-6 bg-gradient-to-b from-primary/30 to-transparent rounded-full mb-2" />
			)}

			<AnimalMiniCard
				animal={ancestor}
				role={role}
				levelIndex={levelIndex}
				onClick={() => onOpenDetail(ancestor)}
			/>

			{levelIndex > 0 && (
				<div className="w-1 h-6 bg-gradient-to-b from-transparent to-primary/20 rounded-full mt-4" />
			)}
		</div>
	);
};

interface TreeControlsProps {
	lineageMode: "ambos" | "paterna" | "materna";
	depthShown: number;
	maxDepth: number;
	onLineageChange: (mode: "ambos" | "paterna" | "materna") => void;
	onDepthChange: (depth: number) => void;
}

export const TreeControls: React.FC<TreeControlsProps> = ({
	lineageMode,
	depthShown,
	maxDepth,
	onLineageChange,
	onDepthChange,
}) => (
	<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 shadow-sm print:hidden">
		<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
			<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Filtrar línea:
			</span>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<button
					onClick={() => onLineageChange("ambos")}
					className={cn(
						"px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
						lineageMode === "ambos"
							? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/50"
							: "bg-background/50 hover:bg-background border border-border/50 hover:shadow-md",
					)}
				>
					👨‍👩‍👦 Completa
				</button>
				<button
					onClick={() => onLineageChange("paterna")}
					className={cn(
						"px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
						lineageMode === "paterna"
							? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50"
							: "bg-background/50 hover:bg-background border border-border/50 hover:shadow-md",
					)}
				>
					♂ Paterna
				</button>
				<button
					onClick={() => onLineageChange("materna")}
					className={cn(
						"px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
						lineageMode === "materna"
							? "bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-600/30 ring-2 ring-pink-400/50"
							: "bg-background/50 hover:bg-background border border-border/50 hover:shadow-md",
					)}
				>
					♀ Materna
				</button>
			</div>
		</div>

		<div className="flex flex-col sm:flex-row items-center gap-3">
			<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Generaciones:
			</span>
			<div className="flex items-center gap-2">
				<input
					type="range"
					min={1}
					max={maxDepth}
					value={depthShown}
					onChange={(e) => onDepthChange(Number(e.target.value))}
					className="w-24 h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
				/>
				<span className="text-sm font-bold text-primary min-w-[2ch] px-2 py-1 bg-primary/10 rounded-md">
					{depthShown}
				</span>
			</div>
		</div>
	</div>
);

interface TreeErrorStateProps {
	treeError: string;
}

export const TreeErrorState: React.FC<TreeErrorStateProps> = ({
	treeError,
}) => (
	<div className="text-center py-12">
		<Users className="mx-auto h-16 w-16 text-destructive/30 mb-4" />
		<p className="text-destructive text-lg font-medium">
			Error al cargar información genealógica
		</p>
		<p className="text-muted-foreground/70 text-sm mt-2">{treeError}</p>
	</div>
);

interface TreeEmptyStateProps {
	dependencyInfo?: {
		has_parents: boolean;
		father_id: number;
		mother_id: number;
	} | null;
	counts?: { nodes: number; edges: number } | null;
}

export const TreeEmptyState: React.FC<TreeEmptyStateProps> = ({
	dependencyInfo,
	counts,
}) => (
	<div className="text-center py-12">
		<Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
		<p className="text-muted-foreground text-lg font-medium">
			No se encontró información genealógica
		</p>
		<p className="text-muted-foreground/70 text-sm mt-2">
			{dependencyInfo && !dependencyInfo.has_parents
				? "Este animal no tiene padres registrados en la base de datos."
				: "Este animal no tiene antepasados registrados"}
		</p>

		{dependencyInfo && (
			<div className="mt-6 p-4 rounded-lg border bg-muted/30 border-border/50 max-w-md mx-auto">
				<h4 className="text-sm font-semibold text-foreground mb-2">
					Información de depuración:
				</h4>
				<div className="text-xs text-muted-foreground space-y-1">
					<div>
						Padre registrado:{" "}
						{dependencyInfo.father_id ? `ID ${dependencyInfo.father_id}` : "No"}
					</div>
					<div>
						Madre registrada:{" "}
						{dependencyInfo.mother_id ? `ID ${dependencyInfo.mother_id}` : "No"}
					</div>
					<div>Total de nodos: {counts?.nodes || 0}</div>
					<div>Total de relaciones: {counts?.edges || 0}</div>
				</div>
			</div>
		)}
	</div>
);

interface PrintHeaderProps {
	animal: any;
	getBreedLabel: (record: any) => string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
	animal,
	getBreedLabel,
}) => (
	<div className="hidden print:block border-b-2 border-slate-300 pb-6 mb-8 text-slate-800">
		<div className="flex justify-between items-start">
			<div>
				<h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
					Finca Digital - Villaluz
				</h1>
				<p className="text-sm font-semibold text-slate-500">
					Reporte de Árbol Genealógico (Antepasados)
				</p>
			</div>
			<div className="text-right text-xs text-slate-500">
				<p>Fecha de Generación:</p>
				<p className="font-bold text-slate-700">
					{new Date().toLocaleString("es-CO")}
				</p>
			</div>
		</div>

		<div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
			<div>
				<span className="text-[11px] uppercase font-bold text-slate-400 block">
					Identificador
				</span>
				<span className="text-sm font-bold text-slate-800">
					{animal?.record || "N/A"}
				</span>
			</div>
			<div>
				<span className="text-[11px] uppercase font-bold text-slate-400 block">
					Nombre
				</span>
				<span className="text-sm font-bold text-slate-800">
					{animal?.name || "Sin Nombre"}
				</span>
			</div>
			<div>
				<span className="text-[11px] uppercase font-bold text-slate-400 block">
					Raza
				</span>
				<span className="text-sm font-bold text-slate-800">
					{getBreedLabel(animal)}
				</span>
			</div>
			<div>
				<span className="text-[11px] uppercase font-bold text-slate-400 block">
					Sexo
				</span>
				<span className="text-sm font-bold text-slate-800">
					{(animal?.sex ?? animal?.gender) || "N/A"}
				</span>
			</div>
		</div>
	</div>
);

interface CoupleLevelRowProps {
	couple: any;
	levelIndex: number;
	onOpenDetail: (animal: any) => void;
}

export const CoupleLevelRow: React.FC<CoupleLevelRowProps> = ({
	couple,
	levelIndex,
	onOpenDetail,
}) => (
	<div
		key={`${levelIndex}-${JSON.stringify(couple.father?.id || "")}-${JSON.stringify(couple.mother?.id || "")}`}
		className="flex flex-col items-center"
	>
		{levelIndex > 0 && (
			<div className="w-1 h-6 bg-gradient-to-b from-primary/30 to-transparent rounded-full mb-3" />
		)}

		<CoupleGroupCard
			couple={couple}
			levelIndex={levelIndex}
			onOpenDetail={onOpenDetail}
		/>

		{levelIndex > 0 && (
			<div className="w-1 h-6 bg-gradient-to-b from-transparent to-primary/20 rounded-full mt-4" />
		)}
	</div>
);

interface PrintButtonProps {
	onClick: () => void;
}

export const PrintButton: React.FC<PrintButtonProps> = ({ onClick }) => (
	<button
		onClick={onClick}
		className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
	>
		<Printer className="h-4 w-4" />
		<span>Imprimir Reporte</span>
	</button>
);
