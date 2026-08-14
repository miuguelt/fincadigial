import type { ReactNode } from "react";
import { GenericModal } from "@/shared/ui/common/GenericModal";

interface CampesinoModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}

export function CampesinoModal({
	open,
	onClose,
	title,
	children,
}: CampesinoModalProps) {
	return (
		<GenericModal
			isOpen={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
			}}
			title={title}
			size="lg"
			icon={null}
			bodyClassName="overflow-y-auto overscroll-contain p-0 focus:outline-none"
		>
			{children}
		</GenericModal>
	);
}
