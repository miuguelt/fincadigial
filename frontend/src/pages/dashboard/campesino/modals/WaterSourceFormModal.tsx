import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	RELIABILITY_OPTIONS,
	SOURCE_TYPES,
	type WaterSourceFormData,
} from "../config/waterSources";
import { CampesinoModal } from "./CampesinoModal";

interface WaterSourceFormModalProps {
	open: boolean;
	onClose: () => void;
	editId: number | null;
	initialData: WaterSourceFormData;
	onSave: (data: WaterSourceFormData) => Promise<void>;
}

export function WaterSourceFormModal({
	open,
	onClose,
	editId,
	initialData: _initial,
	onSave,
}: WaterSourceFormModalProps) {
	const [form, setForm] = useState<WaterSourceFormData>(_initial);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (!form.name) return;
		setSaving(true);
		try {
			await onSave(form);
		} finally {
			setSaving(false);
		}
	};

	return (
		<CampesinoModal
			open={open}
			onClose={onClose}
			title={editId ? "✏️ Editar Fuente" : "💧 Nueva Fuente de Agua"}
		>
			<div className="p-5 space-y-4">
				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						Nombre *
					</label>
					<input
						type="text"
						placeholder="Ej: Quebrada La Honda, Pozo Norte"
						value={form.name}
						onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
						className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
					/>
				</div>

				<div>
					<p className="text-sm font-medium text-foreground mb-2">
						Tipo de fuente
					</p>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{SOURCE_TYPES.map((t) => (
							<button
								key={t.value}
								onClick={() => setForm((f) => ({ ...f, source_type: t.value }))}
								className={`flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-xl border-2 text-[11px] md:text-xs font-semibold transition-all ${form.source_type === t.value ? `${t.border} ${t.color}` : "border-border bg-background text-muted-foreground"}`}
							>
								<span className="text-lg md:text-xl">{t.emoji}</span>
								<span className="break-words leading-tight text-center">
									{t.label}
								</span>
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						Capacidad estimada (litros)
					</label>
					<input
						type="number"
						min="0"
						step="100"
						placeholder="0"
						value={form.capacity_liters}
						onChange={(e) =>
							setForm((f) => ({ ...f, capacity_liters: e.target.value }))
						}
						className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
					/>
				</div>

				<button
					onClick={() => setForm((f) => ({ ...f, is_potable: !f.is_potable }))}
					className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${form.is_potable ? "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300" : "border-border bg-background text-muted-foreground"}`}
				>
					<span className="font-medium text-sm">¿El agua es potable?</span>
					<span className="text-2xl">{form.is_potable ? "✅" : "❌"}</span>
				</button>

				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						Confiabilidad
					</label>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{RELIABILITY_OPTIONS.map((r) => (
							<button
								key={r.value}
								onClick={() => setForm((f) => ({ ...f, reliability: r.value }))}
								className={`flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-xl border-2 text-[11px] md:text-xs font-semibold transition-all ${form.reliability === r.value ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300" : "border-border bg-background text-muted-foreground"}`}
							>
								<span>{r.emoji}</span>
								<span className="break-words leading-tight text-center">
									{r.label}
								</span>
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						Observaciones
					</label>
					<textarea
						rows={2}
						placeholder="Notas sobre acceso, estado, uso..."
						value={form.notes}
						onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
						className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none"
					/>
				</div>
			</div>

			<div className="px-5 pb-5">
				<Button
					onClick={handleSave}
					disabled={saving}
					className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl py-3 text-base font-bold"
				>
					{saving ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Guardando...
						</>
					) : (
						"✅ Guardar Fuente"
					)}
				</Button>
			</div>
		</CampesinoModal>
	);
}
