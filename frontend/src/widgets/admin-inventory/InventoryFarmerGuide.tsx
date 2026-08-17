import { ChevronDown, ChevronUp, HelpCircle, PackagePlus, Sparkles, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const GUIDE_STORAGE_KEY = "inventory:farmer_guide:collapsed";

export function InventoryFarmerGuide() {
	const [collapsed, setCollapsed] = useState(true);

	useEffect(() => {
		try {
			// Por defecto colapsado en visitas recurrentes si ya lo cerró
			const stored = localStorage.getItem(GUIDE_STORAGE_KEY);
			if (stored !== null) {
				setCollapsed(stored === "1");
			} else {
				// Abierto por primera vez para guiar al usuario
				setCollapsed(false);
			}
		} catch {
			/* local storage no disponible */
		}
	}, []);

	const toggle = useCallback(() => {
		setCollapsed((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(GUIDE_STORAGE_KEY, next ? "1" : "0");
			} catch {
				/* ignore */
			}
			return next;
		});
	}, []);

	return (
		<div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-sky-500/5 to-emerald-500/10 p-3.5 shadow-sm transition-all duration-300">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shrink-0">
						<HelpCircle className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<h3 className="text-sm font-black text-foreground flex items-center gap-2">
							🌾 Guía de Campo: ¿Cómo reabastecer tus insumos y medicamentos?
						</h3>
						<p className="text-xs text-muted-foreground">
							Aprende cuándo ingresar stock a un lote existente o cuándo crear un lote nuevo.
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={toggle}
					aria-expanded={!collapsed}
					className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
				>
					{collapsed ? (
						<>
							<ChevronDown className="h-3.5 w-3.5" /> Ver guía
						</>
					) : (
						<>
							<ChevronUp className="h-3.5 w-3.5" /> Ocultar guía
						</>
					)}
				</button>
			</div>

			{!collapsed && (
				<div className="mt-3.5 grid gap-3 border-t border-emerald-500/20 pt-3 text-xs [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
					{/* Opción 1: Entrar Stock */}
					<div className="rounded-lg border border-emerald-500/20 bg-background/80 p-3 space-y-1.5 shadow-sm">
						<div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs uppercase tracking-wide">
							<TrendingUp className="h-4 w-4 text-emerald-600" />
							1. Entrar Stock (Mismo lote)
						</div>
						<p className="text-muted-foreground leading-relaxed">
							<strong>¿Llegaron más frascos o dosis del mismo lote y fecha?</strong> Usa el botón{" "}
							<span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
								📥 Entrar Stock
							</span>{" "}
							en la fila para sumar existencias de inmediato con un solo número.
						</p>
					</div>

					{/* Opción 2: Nuevo Lote */}
					<div className="rounded-lg border border-sky-500/20 bg-background/80 p-3 space-y-1.5 shadow-sm">
						<div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-400 text-xs uppercase tracking-wide">
							<PackagePlus className="h-4 w-4 text-sky-600" />
							2. Nuevo Lote (Compra nueva)
						</div>
						<p className="text-muted-foreground leading-relaxed">
							<strong>¿Compraste un frasco nuevo con otra fecha de vencimiento?</strong> Usa el botón{" "}
							<span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-300 font-bold text-[11px]">
								📦 Nuevo Lote
							</span>{" "}
							para clonar el producto y solo ingresar el número de lote y vencimiento.
						</p>
					</div>

					{/* Opción 3: Semáforo de Stock */}
					<div className="rounded-lg border border-amber-500/20 bg-background/80 p-3 space-y-1.5 shadow-sm">
						<div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wide">
							<Sparkles className="h-4 w-4 text-amber-500" />
							3. Semáforo de Stock
						</div>
						<ul className="space-y-1 text-muted-foreground">
							<li className="flex items-center gap-1.5">
								<span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
								<span><strong>Verde:</strong> Stock disponible y seguro.</span>
							</li>
							<li className="flex items-center gap-1.5">
								<span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
								<span><strong>Amarillo:</strong> Queda menos del 30% del lote.</span>
							</li>
							<li className="flex items-center gap-1.5">
								<span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
								<span><strong>Rojo:</strong> Stock crítico (menor al mínimo) o agotado.</span>
							</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	);
}
