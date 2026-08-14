import { Button } from "@/shared/ui/button";
import type { CorralFormController } from "./useCorralForm";

interface FormActionsProps {
	form: CorralFormController;
	onClose?: () => void;
}

export function FormActions({ form, onClose }: FormActionsProps) {
	return (
		<div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-border bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_-12px_rgba(15,23,42,0.45)] backdrop-blur sm:static sm:mx-0 sm:flex-row sm:bg-transparent sm:p-0 sm:pt-4 sm:shadow-none">
			{onClose && (
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					className="h-14 w-full border-2 border-border text-base text-foreground sm:w-1/3"
				>
					Cerrar sin guardar
				</Button>
			)}
			<Button
				type="submit"
				loading={form.isSubmitting}
				disabled={form.animalId === "" || form.healthStatus === ""}
				aria-describedby={
					form.healthStatus === "" ? "corral-health-required" : undefined
				}
				className={`${onClose ? "sm:w-2/3" : ""} h-16 w-full bg-emerald-700 text-xl font-bold shadow-lg hover:bg-emerald-800`}
			>
				{form.isSubmitting ? "Guardando…" : "💾 Guardar datos del animal"}
			</Button>
		</div>
	);
}
