import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	type ClimateAlertFormData,
	RISK_TYPES,
	SEVERITY_CFG,
} from "../config/climateAlerts";
import { CampesinoModal } from "./CampesinoModal";

interface ClimateAlertFormModalProps {
	open: boolean;
	onClose: () => void;
	editId: number | null;
	initialData: ClimateAlertFormData;
	onSave: (data: ClimateAlertFormData) => Promise<void>;
}

export function ClimateAlertFormModal({
	open,
	onClose,
	editId,
	initialData: _initial,
	onSave,
}: ClimateAlertFormModalProps) {
	const [form, setForm] = useState<ClimateAlertFormData>(_initial);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (!form.title || !form.risk_type) return;
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
			title={editId ? "✏️ Editar Alerta" : "⛈️ Nueva Alerta"}
		>
			<div className="p-5 space-y-4">
				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						Título *
					</label>
					<input
						type="text"
						placeholder="Ej: Helada prevista esta noche"
						value={form.title}
						onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
						className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
					/>
				</div>

				<div>
					<p className="text-sm font-medium text-foreground mb-2">
						Tipo de riesgo *
					</p>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{RISK_TYPES.map((r) => (
							<button
								key={r.value}
								onClick={() => setForm((f) => ({ ...f, risk_type: r.value }))}
								className={`flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-xl border-2 text-[11px] md:text-xs font-semibold transition-all ${form.risk_type === r.value ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300" : "border-border bg-background text-muted-foreground"}`}
							>
								<span className="text-lg md:text-xl">{r.emoji}</span>
								<span className="break-words leading-tight text-center">
									{r.label}
								</span>
							</button>
						))}
					</div>
				</div>

				<div>
					<p className="text-sm font-medium text-foreground mb-2">
						¿Qué tan grave es?
					</p>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{Object.entries(SEVERITY_CFG).map(([key, cfg]) => (
							<button
								key={key}
								onClick={() => setForm((f) => ({ ...f, severity: key }))}
								className={`flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-xl border-2 text-[11px] md:text-xs font-semibold transition-all ${form.severity === key ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-border bg-background text-muted-foreground"}`}
							>
								<span className="text-lg md:text-xl">{cfg.emoji}</span>
								<span className="break-words leading-tight text-center">
									{cfg.label}
								</span>
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						Descripción
					</label>
					<textarea
						rows={2}
						placeholder="Detalles sobre el riesgo..."
						value={form.description}
						onChange={(e) =>
							setForm((f) => ({ ...f, description: e.target.value }))
						}
						className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						💡 ¿Qué debe hacer?
					</label>
					<textarea
						rows={2}
						placeholder="Acciones recomendadas..."
						value={form.recommendation}
						onChange={(e) =>
							setForm((f) => ({ ...f, recommendation: e.target.value }))
						}
						className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
					/>
				</div>

				<div className="flex gap-3">
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1.5">
							📅 Desde
						</label>
						<input
							type="datetime-local"
							value={form.valid_from}
							onChange={(e) =>
								setForm((f) => ({ ...f, valid_from: e.target.value }))
							}
							className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
						/>
					</div>
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1.5">
							📅 Hasta
						</label>
						<input
							type="datetime-local"
							value={form.valid_until}
							onChange={(e) =>
								setForm((f) => ({ ...f, valid_until: e.target.value }))
							}
							className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
						/>
					</div>
				</div>

				<button
					onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
					className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${form.is_active ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300" : "border-border bg-background text-muted-foreground"}`}
				>
					<span className="font-medium text-sm">¿Alerta activa?</span>
					<span className="text-2xl">{form.is_active ? "✅" : "❌"}</span>
				</button>
			</div>

			<div className="px-5 pb-5">
				<Button
					onClick={handleSave}
					disabled={saving}
					className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-base font-bold"
				>
					{saving ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Guardando...
						</>
					) : (
						"✅ Guardar Alerta"
					)}
				</Button>
			</div>
		</CampesinoModal>
	);
}
