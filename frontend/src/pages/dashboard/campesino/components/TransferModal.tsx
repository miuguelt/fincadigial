import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, WifiOff } from "lucide-react";
import { useCampesinoTransfer } from "../hooks/useCampesinoTransfer";
import { IconRoute as IconRouteCattle } from "@/shared/icons/cattle";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface TransferModalProps {
	isOpen: boolean;
	onClose: () => void;
	animals: any[];
	fields: any[];
	onSuccess: () => void;
}

export function TransferModal({
	isOpen,
	onClose,
	animals,
	fields,
	onSuccess,
}: TransferModalProps) {
	const {
		form: transferForm,
		setForm: setTransferForm,
		saving: savingForm,
		successData,
		isOnline,
		submit: handleTransferSubmit,
		closeSuccess: handleCloseSuccess,
		dismiss: handleDismiss,
	} = useCampesinoTransfer({ animals, fields, onClose, onSuccess });

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleDismiss();
			}}
		>
			<DialogContent
				className="p-0 overflow-hidden rounded-xl"
				fullWidth={false}
			>
				<DialogDescription className="sr-only">
					Registra el traslado del animal seleccionado.
				</DialogDescription>
				<AnimatePresence mode="wait">
					{successData ? (
						<motion.div
							key="success"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ type: "spring", damping: 20, stiffness: 300 }}
						>
							<div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6 text-white text-center">
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ delay: 0.2, type: "spring", damping: 15 }}
									className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center"
								>
									<CheckCircle2 className="w-10 h-10 text-white" />
								</motion.div>
								<DialogTitle className="text-2xl font-black text-white">
									¡Traslado Exitoso!
								</DialogTitle>
								<p className="text-emerald-100 text-sm mt-1">
									{successData.animalName} fue trasladad
									{successData.animalName.includes("Vaca") ||
									successData.animalName.includes("vaca")
										? "a"
										: "o"}{" "}
									correctamente
								</p>
							</div>

							<div className="p-6 space-y-5">
								<div className="flex items-center justify-center gap-4 py-4">
									<motion.div
										initial={{ x: -20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										transition={{ delay: 0.4 }}
										className="flex flex-col items-center gap-2"
									>
										<div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
											<span className="text-red-600 font-black text-lg">
												🐄
											</span>
										</div>
										<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
											Animal
										</p>
										<p className="text-sm font-black text-slate-800">
											{successData.animalName}
										</p>
									</motion.div>

									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: 0.6, type: "spring" }}
									>
										<ArrowRight className="w-8 h-8 text-emerald-500" />
									</motion.div>

									<motion.div
										initial={{ x: 20, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										transition={{ delay: 0.4 }}
										className="flex flex-col items-center gap-2"
									>
										<div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
											<span className="text-emerald-600 font-black text-lg">
												🌱
											</span>
										</div>
										<p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
											Destino
										</p>
										<p className="text-sm font-black text-slate-800">
											{successData.targetFieldName}
										</p>
									</motion.div>
								</div>

								<div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
									<p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
										Animales en {successData.targetFieldName}
									</p>
									<div className="flex items-center justify-center gap-3 text-3xl font-black">
										<motion.span
											key={successData.targetFieldOldCount}
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-slate-400"
										>
											{successData.targetFieldOldCount}
										</motion.span>
										<motion.span
											initial={{ opacity: 0, scale: 0 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ delay: 0.8, type: "spring" }}
											className="text-emerald-600"
										>
											→
										</motion.span>
										<motion.span
											key={successData.targetFieldNewCount}
											initial={{ opacity: 0, y: 20, scale: 1.5 }}
											animate={{ opacity: 1, y: 0, scale: 1 }}
											transition={{ delay: 1.0, type: "spring", damping: 12 }}
											className="text-emerald-700"
										>
											{successData.targetFieldNewCount}
										</motion.span>
									</div>
									<motion.p
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 1.3 }}
										className="text-xs text-emerald-500 font-bold mt-1"
									>
										+1 animal
									</motion.p>
								</div>

								<Button
									onClick={handleCloseSuccess}
									className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-widest rounded-xl border-0 shadow-md shadow-emerald-500/10 transition-all active:scale-95"
								>
									Continuar
								</Button>
							</div>
						</motion.div>
					) : (
						<motion.div
							key="form"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<div className="bg-emerald-600 px-6 py-5 text-white flex items-center gap-3">
								<div className="p-2 bg-white/20 rounded-xl">
									<IconRouteCattle className="w-6 h-6" />
								</div>
								<div>
									<DialogTitle className="text-xl font-black uppercase tracking-wider text-white">
										Trasladar Animal
									</DialogTitle>
									<p className="text-xs text-emerald-100">
										Mover un animal a un potrero o lote de destino
									</p>
								</div>
							</div>
							<div className="p-6">
								<form onSubmit={handleTransferSubmit} className="space-y-4">
									{!isOnline && (
										<div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 font-bold">
											<WifiOff className="h-4 w-4" /> Modo sin conexión - Se
											guardará localmente
										</div>
									)}

									<div className="space-y-2">
										<Label htmlFor="tf-animal">Seleccione el animal *</Label>
										<Select
											value={transferForm.animalId}
											onValueChange={(v) =>
												setTransferForm((prev) => ({ ...prev, animalId: v }))
											}
										>
											<SelectTrigger
												id="tf-animal"
												className="border h-11"
											>
												<SelectValue placeholder="— Seleccione el animal —" />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												{animals.map((a) => (
													<SelectItem key={a.id} value={a.id.toString()}>
														{a.record}{" "}
														{a.breed?.name ? `— ${a.breed.name}` : ""}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="tf-field">
											Potrero / Lote de Destino *
										</Label>
										<Select
											value={transferForm.fieldId}
											onValueChange={(v) =>
												setTransferForm((prev) => ({ ...prev, fieldId: v }))
											}
										>
											<SelectTrigger
												id="tf-field"
												className="border h-11"
											>
												<SelectValue placeholder="— Seleccionar potrero —" />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												{fields.map((f) => (
													<SelectItem key={f.id} value={f.id.toString()}>
														{f.name || `Potrero ${f.id}`}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="tf-date">Fecha de traslado *</Label>
										<Input
											id="tf-date"
											type="date"
											value={transferForm.date}
											onChange={(e) =>
												setTransferForm((prev) => ({
													...prev,
													date: e.target.value,
												}))
											}
											required
											className="rounded-xl h-11 border bg-white"
										/>
									</div>

									<Button
										type="submit"
										disabled={savingForm}
										className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-emerald-500/10 transition-all active:scale-95"
									>
										{savingForm ? "Trasladando..." : "Confirmar Traslado"}
									</Button>
								</form>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	);
}
