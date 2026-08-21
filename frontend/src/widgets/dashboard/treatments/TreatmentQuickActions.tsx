import { Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { HealthInterventionWizard } from "@/widgets/dashboard/treatments/HealthInterventionWizard";

interface TreatmentQuickActionsProps {
	/** Callback after a treatment is successfully created via the wizard */
	onTreatmentCreated: () => void;
}

/**
 * Floating Action Button (FAB) for quick treatment registration.
 * Mobile-first: 56px circular button in thumb zone (bottom-right).
 * Desktop: Expands to show text label.
 *
 * Opens the existing HealthInterventionWizard for a guided 3-step flow:
 * Animal → Diagnóstico → Insumos
 */
export const TreatmentQuickActions: React.FC<TreatmentQuickActionsProps> = ({
	onTreatmentCreated,
}) => {
	const [wizardOpen, setWizardOpen] = useState(false);

	return (
		<>
			{/* FAB — fixed in thumb zone */}
			<button
				type="button"
				onClick={() => setWizardOpen(true)}
				className="
					fixed bottom-20 right-4 sm:bottom-6 sm:right-20 z-40
					flex items-center justify-center gap-2
					h-12 w-12 sm:h-12 sm:w-auto sm:px-5
					rounded-full
					bg-gradient-to-br from-purple-600 to-purple-700
					text-white font-bold text-xs sm:text-sm
					shadow-xl shadow-purple-500/30
					hover:shadow-purple-500/50 hover:scale-105
					active:scale-95
					transition-all duration-300
					focus:outline-none focus:ring-4 focus:ring-purple-500/30
					animate-in fade-in zoom-in-95 duration-500
				"
				aria-label="Registrar tratamiento rápido"
			>
				<Plus className="w-6 h-6 shrink-0" strokeWidth={2.5} />
				{/* Label visible only on sm+ screens */}
				<span className="hidden sm:inline whitespace-nowrap">
					Registrar Tratamiento
				</span>
			</button>

			{/* Wizard modal — reuses existing HealthInterventionWizard */}
			<HealthInterventionWizard
				isOpen={wizardOpen}
				onClose={() => setWizardOpen(false)}
				onSuccess={() => {
					setWizardOpen(false);
					onTreatmentCreated();
				}}
			/>
		</>
	);
};
