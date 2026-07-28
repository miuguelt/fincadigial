import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useId } from "react";

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
	const titleId = useId();

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) onClose();
					}}
				>
					<motion.div
						initial={{ opacity: 0, y: 60 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 60 }}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
					>
						<div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
							<h2 id={titleId} className="font-bold text-lg">
								{title}
							</h2>
							<button
								type="button"
								onClick={onClose}
								aria-label={`Cerrar ${title}`}
								className="p-2 rounded-xl hover:bg-muted transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
