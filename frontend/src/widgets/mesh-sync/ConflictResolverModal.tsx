import { AlertTriangle, Check, Server, Smartphone } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import {
	type SyncConflict,
	SyncConflictsApi,
} from "@/shared/api/offline/SyncConflictsApi";

export const ConflictResolverModal: React.FC<{ onClose: () => void }> = ({
	onClose,
}) => {
	const { user } = useAuth();
	const currentFincaId = user?.finca_id;
	const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
	const [loading, setLoading] = useState(true);
	const [resolvingId, setResolvingId] = useState<number | null>(null);

	useEffect(() => {
		loadConflicts();
	}, [currentFincaId]);

	const loadConflicts = async () => {
		if (!currentFincaId) return;
		setLoading(true);
		const data = await SyncConflictsApi.getActiveConflicts(currentFincaId);
		setConflicts(data);
		setLoading(false);
	};

	const handleResolve = async (
		conflictId: number,
		resolution: "server" | "local" | "reject",
	) => {
		if (!currentFincaId) return;
		setResolvingId(conflictId);

		// Si elige "server", rechazamos la operación entrante.
		// Si elige "local" (celular), aceptamos la operación entrante.
		// Si elige "reject", la rechazamos completamente.
		const apiResolution = resolution === "server" ? "reject" : "accept";

		const success = await SyncConflictsApi.resolveConflict(
			currentFincaId,
			conflictId,
			apiResolution,
		);
		if (success) {
			setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
		}
		setResolvingId(null);
	};

	const renderPayloadDiff = (local: any, incoming: any) => {
		const keys = new Set([
			...Object.keys(local || {}),
			...Object.keys(incoming || {}),
		]);

		return (
			<div className="text-sm font-mono bg-gray-50 rounded-lg p-2 max-h-48 overflow-y-auto">
				<table className="w-full text-left">
					<thead>
						<tr className="text-gray-500 text-xs border-b">
							<th className="pb-1">Campo</th>
							<th className="pb-1 text-blue-600">Servidor (Actual)</th>
							<th className="pb-1 text-emerald-600">Celular (Entrante)</th>
						</tr>
					</thead>
					<tbody>
						{Array.from(keys).map((key) => {
							// Ignorar campos de auditoría
							if (["updated_at", "created_at", "id", "finca_id"].includes(key))
								return null;

							const localVal = JSON.stringify(local?.[key] ?? "-");
							const incVal = JSON.stringify(incoming?.[key] ?? "-");
							const isDiff =
								localVal !== incVal && incoming?.[key] !== undefined;

							return (
								<tr
									key={key}
									className={`border-b border-gray-100 last:border-0 ${isDiff ? "bg-yellow-50/50" : ""}`}
								>
									<td className="py-1 pr-2 font-semibold text-gray-700">
										{key}
									</td>
									<td
										className={`py-1 pr-2 ${isDiff ? "text-red-500 line-through" : "text-gray-600"}`}
									>
										{localVal}
									</td>
									<td
										className={`py-1 ${isDiff ? "text-emerald-600 font-bold" : "text-gray-600"}`}
									>
										{incVal}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Resolución de conflictos"
				className="flex max-h-[92dvh] w-full max-w-[1600px] flex-col overflow-hidden rounded-t-2xl bg-white p-4 shadow-2xl sm:w-[95vw] sm:rounded-2xl sm:p-6"
				style={{ fontFamily: "'Inter', sans-serif" }}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b pb-4 border-gray-100">
					<div className="flex items-center gap-3 text-orange-600">
						<div className="bg-orange-100 p-2 rounded-lg">
							<AlertTriangle size={24} />
						</div>
						<div>
							<h2 className="text-xl font-bold text-gray-800">
								Resolución de Conflictos
							</h2>
							<p className="text-sm text-gray-500">
								Dos dispositivos modificaron el mismo dato estando sin internet.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Cerrar resolución de conflictos"
						className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
					>
						Cerrar
					</button>
				</div>

				{/* Contenido */}
				<div className="flex-1 overflow-y-auto py-4">
					{loading ? (
						<div className="flex justify-center p-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
						</div>
					) : conflicts.length === 0 ? (
						<div className="text-center py-12">
							<div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<Check size={32} />
							</div>
							<h3 className="text-lg font-bold text-gray-800">Todo en orden</h3>
							<p className="text-gray-500">
								No hay conflictos pendientes de sincronización.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-6">
							{conflicts.map((conflict) => (
								<div
									key={conflict.id}
									className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
								>
									{/* Info Header */}
									<div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
										<div>
											<span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
												Entidad: {conflict.entity_type}
											</span>
											<h4 className="font-bold text-gray-900 text-lg">
												ID: {conflict.entity_id || "Nuevo"}
											</h4>
											<p className="text-xs text-gray-500">
												Detectado el{" "}
												{new Date(conflict.created_at).toLocaleString()}
											</p>
										</div>
									</div>

									{/* Diff Viewer */}
									<div className="p-4">
										{renderPayloadDiff(
											conflict.local_payload,
											conflict.incoming_payload,
										)}
									</div>

									{/* Actions */}
									<div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
										<button
											disabled={resolvingId === conflict.id}
											onClick={() => handleResolve(conflict.id, "server")}
											className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg font-semibold transition-colors"
										>
											<Server size={18} />
											Mantener Dato del Servidor
										</button>

										<button
											disabled={resolvingId === conflict.id}
											onClick={() => handleResolve(conflict.id, "local")}
											className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
										>
											<Smartphone size={18} />
											Aceptar Dato del Celular
											{resolvingId === conflict.id && (
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
											)}
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
