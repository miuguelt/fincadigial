import { motion } from "framer-motion";
import { Check, ChevronRight, Settings2 } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/ui/cn";

interface QuickAction {
	id: string;
	icon: React.ReactNode;
	label: string;
	sub: string;
	path: string;
	bg: string;
	ring: string;
	category?: "registro" | "animal" | "navegacion";
}

const CATEGORY_LABELS: Record<string, string> = {
	registro: "⚡ Registro Rápido",
	animal: "🐄 Ganado y Campo",
	navegacion: "🏠 Navegación",
};

interface ActionGridProps {
	items: QuickAction[];
	onAction: (path: string) => void;
	onEdit: () => void;
}

export const ActionGrid: React.FC<ActionGridProps> = ({
	items,
	onAction,
	onEdit,
}) => {
	const grouped = items.reduce(
		(acc, item) => {
			const cat = item.category || "registro";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(item);
			return acc;
		},
		{} as Record<string, QuickAction[]>,
	);

	const hasMultipleCategories = Object.keys(grouped).length > 1;

	return (
		<div className="px-4 pt-3 pb-6 sm:pb-8">
			<div className="flex items-center justify-between mb-4 px-0.5">
				<div>
					<p className="text-[13px] font-bold text-foreground">Acceso Rápido</p>
					<p className="text-[11px] text-muted-foreground/70 mt-0.5">
						Finca Digital · Campo sin señal
					</p>
				</div>
				<button
					onClick={onEdit}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-full",
						"bg-muted/60 border border-border/50",
						"text-[11px] font-semibold text-muted-foreground",
						"hover:bg-muted active:scale-95 transition-all",
					)}
				>
					<Settings2 className="h-3 w-3" />
					Editar
				</button>
			</div>

			{hasMultipleCategories ? (
				<div className="space-y-4">
					{Object.entries(grouped).map(([cat, catItems]) => (
						<div key={cat}>
							<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-0.5">
								{CATEGORY_LABELS[cat] || cat}
							</p>
							<div
								className={cn(
									"grid gap-2",
									catItems.length === 1
										? "grid-cols-1"
										: catItems.length === 2
											? "grid-cols-2"
											: catItems.length === 3
												? "grid-cols-3"
												: "grid-cols-2",
								)}
							>
								{catItems.map((action, idx) => (
									<Tile
										key={action.id}
										action={action}
										index={idx}
										onPress={() => onAction(action.path)}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-2 gap-3">
					{items.map((action, idx) => (
						<Tile
							key={action.id}
							action={action}
							index={idx}
							onPress={() => onAction(action.path)}
						/>
					))}
				</div>
			)}
		</div>
	);
};

interface TileProps {
	action: QuickAction;
	onPress: () => void;
	index?: number;
}

const Tile: React.FC<TileProps> = ({ action, onPress, index = 0 }) => (
	<motion.button
		initial={{ opacity: 0, scale: 0.94, y: 12 }}
		animate={{ opacity: 1, scale: 1, y: 0 }}
		transition={{
			type: "spring",
			stiffness: 150,
			damping: 14,
			delay: index * 0.035,
		}}
		whileTap={{ scale: 0.93 }}
		whileHover={{ scale: 1.02, y: -2 }}
		onClick={onPress}
		className={cn(
			"flex items-center gap-3",
			"py-3.5 px-4 rounded-lg text-left",
			"bg-card/40 dark:bg-card/25 border border-border/40 backdrop-blur-md",
			"hover:bg-card/60 dark:hover:bg-card/35 transition-all duration-200",
			"min-h-[64px] shadow-sm hover:shadow-md",
		)}
		aria-label={action.label}
	>
		<div
			className={cn(
				"h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110",
				action.bg,
			)}
		>
			{action.icon}
		</div>

		<div className="min-w-0 flex-1">
			<p className="text-[13px] font-bold text-foreground leading-tight">
				{action.label}
			</p>
			<p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">
				{action.sub}
			</p>
		</div>
	</motion.button>
);

interface EditPanelProps {
	catalog: QuickAction[];
	favIds: string[];
	onToggle: (id: string) => void;
	onDone: () => void;
	maxFav: number;
}

export const EditPanel: React.FC<EditPanelProps> = ({
	catalog,
	favIds,
	onToggle,
	onDone,
	maxFav,
}) => {
	const count = favIds.length;

	const grouped = catalog.reduce(
		(acc, item) => {
			const cat = item.category || "registro";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(item);
			return acc;
		},
		{} as Record<string, QuickAction[]>,
	);

	return (
		<div className="px-4 pt-3 pb-8">
			<div className="flex items-center justify-between mb-3">
				<div>
					<p className="text-[14px] font-bold text-foreground">Personalizar</p>
					<p className="text-[11px] text-muted-foreground mt-0.5">
						{count} / {maxFav} favoritos seleccionados
					</p>
				</div>
				<button
					onClick={onDone}
					className={cn(
						"flex items-center gap-1.5 px-4 py-2 rounded-full",
						"bg-primary text-white text-[12px] font-bold",
						"shadow-md hover:bg-primary/90 active:scale-95 transition-all",
					)}
				>
					<Check className="h-3.5 w-3.5" />
					Listo
				</button>
			</div>

			<div className="h-1.5 w-full bg-muted/50 rounded-full mb-4 overflow-hidden">
				<motion.div
					className="h-full bg-primary rounded-full"
					animate={{ width: `${(count / maxFav) * 100}%` }}
					transition={{ type: "spring", stiffness: 200, damping: 20 }}
				/>
			</div>

			<div className="space-y-4">
				{Object.entries(grouped).map(([cat, catItems]) => (
					<div key={cat}>
						<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
							{CATEGORY_LABELS[cat] || cat}
						</p>
						<div className="space-y-1.5">
							{catItems.map((action) => {
								const isFav = favIds.includes(action.id);
								const disabled = !isFav && count >= maxFav;

								return (
									<motion.button
										key={action.id}
										whileTap={disabled ? {} : { scale: 0.97 }}
										onClick={() => !disabled && onToggle(action.id)}
										disabled={disabled}
										className={cn(
											"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
											isFav
												? "border-primary/40 bg-primary/8 shadow-sm"
												: disabled
													? "border-border/20 opacity-35 cursor-not-allowed"
													: "border-border/40 bg-muted/20 hover:bg-muted/40",
										)}
									>
										<div
											className={cn(
												"h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm relative",
												action.bg,
											)}
										>
											{action.icon}
											{isFav && (
												<span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-card shadow-sm">
													<Check className="h-2.5 w-2.5 text-white" />
												</span>
											)}
										</div>

										<div className="min-w-0 flex-1">
											<p className="text-[13px] font-bold leading-tight text-foreground">
												{action.label}
											</p>
											<p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">
												{action.sub}
											</p>
										</div>

										{isFav && (
											<ChevronRight className="h-4 w-4 text-primary/70 shrink-0" />
										)}
									</motion.button>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export type { QuickAction };
