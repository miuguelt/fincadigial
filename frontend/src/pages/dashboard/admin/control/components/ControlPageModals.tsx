import { QuickAnimalTransferForm } from "@/features/animal-bulk-actions";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { ControlEntryFormWidget } from "@/widgets/control";
import { MilkEntryFormWidget } from "@/widgets/milk";
import type { ControlModalKey } from "../controlPage.types";
import type { ControlOptionsState } from "../hooks/useControlOptions";
import { CorralPanel } from "./CorralPanel";

interface ControlPageModalsProps {
	activeModal: ControlModalKey | null;
	options: ControlOptionsState;
	onClose: () => void;
	onSaved: () => void;
}

export function ControlPageModals({
	activeModal,
	options,
	onClose,
	onSaved,
}: ControlPageModalsProps) {
	const handleOpenChange = (open: boolean) => {
		if (!open) onClose();
	};

	return (
		<>
			<GenericModal
				isOpen={activeModal === "milk"}
				onOpenChange={handleOpenChange}
				title="Registrar ordeño"
				description="Formulario para guardar el ordeño de una vaca."
				themeColor="blue"
				size="lg"
				enableBackdropBlur
			>
				<MilkEntryFormWidget onSuccess={onSaved} onCancel={onClose} />
			</GenericModal>

			<GenericModal
				isOpen={activeModal === "weight"}
				onOpenChange={handleOpenChange}
				title="Registrar peso"
				description="Formulario para guardar el peso y el estado observado del animal."
				themeColor="amber"
				size="lg"
				enableBackdropBlur
			>
				<ControlEntryFormWidget
					mode="weight"
					onSuccess={onSaved}
					onCancel={onClose}
				/>
			</GenericModal>

			<GenericModal
				isOpen={activeModal === "health"}
				onOpenChange={handleOpenChange}
				title="Reportar animal enfermo o decaído"
				description="Formulario para registrar una novedad en la salud de un animal."
				themeColor="emerald"
				size="lg"
				enableBackdropBlur
			>
				<ControlEntryFormWidget
					mode="health"
					onSuccess={onSaved}
					onCancel={onClose}
				/>
			</GenericModal>

			<GenericModal
				isOpen={activeModal === "transfer"}
				onOpenChange={handleOpenChange}
				title="Mover animal de potrero"
				description="Formulario para cambiar un animal al potrero elegido."
				themeColor="amber"
				size="lg"
				enableBackdropBlur
			>
				<QuickAnimalTransferForm
					{...options}
					onRetry={options.reload}
					onSuccess={onSaved}
					onCancel={onClose}
				/>
			</GenericModal>

			<GenericModal
				isOpen={activeModal === "corral"}
				onOpenChange={handleOpenChange}
				title="Registrar varios datos de un animal"
				description="Formulario completo para guardar varios datos del mismo animal."
				themeColor="emerald"
				size="lg"
				enableBackdropBlur
			>
				<CorralPanel onClose={onSaved} />
			</GenericModal>
		</>
	);
}
