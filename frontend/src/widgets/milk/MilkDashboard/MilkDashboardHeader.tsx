import { MoreVertical, Plus, RefreshCw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";

interface MilkDashboardHeaderProps {
	onImport: () => void;
	onRefresh: () => void;
	onRegister: () => void;
}

export function MilkDashboardHeader({
	onImport,
	onRefresh,
	onRegister,
}: MilkDashboardHeaderProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const runMenuAction = (action: () => void) => {
		action();
		setMenuOpen(false);
	};

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-2">
				<h2 className="text-lg font-bold text-gray-800">Producción de Leche</h2>
				<div className="relative" ref={menuRef}>
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Abrir acciones de producción de leche"
						aria-expanded={menuOpen}
					>
						<MoreVertical className="h-4 w-4" />
					</button>
					{menuOpen && (
						<div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] max-w-[90vw] z-50">
							<button
								type="button"
								onClick={() => runMenuAction(onRefresh)}
								className="w-full px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
							>
								<RefreshCw className="h-3.5 w-3.5" />
								Actualizar
							</button>
							<button
								type="button"
								onClick={() => runMenuAction(onImport)}
								className="w-full px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
							>
								<Upload className="h-3.5 w-3.5" />
								Importar Excel
							</button>
						</div>
					)}
				</div>
			</div>
			<Button
				size="sm"
				onClick={onRegister}
				className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5 active:scale-95 transition-transform font-semibold w-full sm:w-auto"
			>
				<Plus className="h-4 w-4 mr-1.5" />
				Registrar Ordeño
			</Button>
		</div>
	);
}
