import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalsService } from "@/entities/animal/api/animal.service";
import { breedsService } from "@/entities/breed/api/breeds.service";
import { fieldService } from "@/entities/field/api/field.service";
import { reproductionService } from "@/entities/reproduction/api/reproduction.service";
import { usersService } from "@/entities/user/api/user.service";
import { Button } from "@/shared/ui/button";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { devLogger } from "@/shared/utils/devLogger";
import { cn } from "@/shared/ui/cn";

export type QuickModalType = "animal" | "user" | "field" | "heat" | null;

const quickModalList: Array<{ type: NonNullable<QuickModalType>; label: string }> = [
	{ type: "animal", label: "Nuevo Animal" },
	{ type: "user", label: "Nuevo Usuario" },
	{ type: "field", label: "Nuevo Potrero" },
	{ type: "heat", label: "Registrar Celo" },
];

interface DashboardQuickModalsProps {
	modalType: QuickModalType;
	onClose: () => void;
	onSelectModalType?: (type: QuickModalType) => void;
}

export function DashboardQuickModals({
	modalType,
	onClose,
	onSelectModalType,
}: DashboardQuickModalsProps) {
	const { showToast } = useToast();
	const [loading, setLoading] = useState(false);
	const [successItem, setSuccessItem] = useState<any | null>(null);
	const [internalModalType, setInternalModalType] = useState<QuickModalType>(modalType);

	useEffect(() => {
		setInternalModalType(modalType);
	}, [modalType]);

	const currentType = modalType || internalModalType;

	const handleSwitchType = (newType: QuickModalType) => {
		setSuccessItem(null);
		setInternalModalType(newType);
		onSelectModalType?.(newType);
	};

	const currentIdx = quickModalList.findIndex((item) => item.type === currentType);
	const hasPrevType = currentIdx > 0;
	const hasNextType = currentIdx >= 0 && currentIdx < quickModalList.length - 1;

	const handlePrevType = () => {
		if (hasPrevType) {
			handleSwitchType(quickModalList[currentIdx - 1].type);
		}
	};

	const handleNextType = () => {
		if (hasNextType) {
			handleSwitchType(quickModalList[currentIdx + 1].type);
		}
	};

	// States for options
	const [breeds, setBreeds] = useState<any[]>([]);
	const [femaleAnimals, setFemaleAnimals] = useState<any[]>([]);

	// Forms State
	const [animalForm, setAnimalForm] = useState({
		record: "",
		birth_date: "",
		weight: "",
		gender: "Hembra",
		breeds_id: "",
	});
	const [userForm, setUserForm] = useState({
		name: "",
		fullname: "",
		email: "",
		password: "",
		role: "Operator",
	});
	const [fieldForm, setFieldForm] = useState({
		name: "",
		capacity: "",
		field_type: "Pasto",
	});
	const [heatForm, setHeatForm] = useState({
		animal_id: "",
		event_date: "",
		notes: "",
	});

	useEffect(() => {
		if (currentType === "animal" && breeds.length === 0) {
			breedsService
				.getBreeds({ limit: 100 })
				.then((res: any) => setBreeds(res.data || res))
				.catch(devLogger.error);
		}
		if (currentType === "heat" && femaleAnimals.length === 0) {
			animalsService
				.getAnimals({ limit: 200, sex: "Hembra", status: "Vivo" })
				.then((res: any) =>
					setFemaleAnimals(Array.isArray(res) ? res : res.data || []),
				)
				.catch(devLogger.error);
		}
		setSuccessItem(null);
	}, [breeds.length, femaleAnimals.length, currentType]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			let createdItem = null;
			if (currentType === "animal") {
				if (!animalForm.breeds_id) throw new Error("Debe seleccionar una raza");
				if (
					animalForm.birth_date &&
					animalForm.birth_date > getTodayColombia()
				) {
					throw new Error("La fecha de nacimiento no puede ser futura");
				}
				createdItem = await animalsService.createAnimal({
					record: animalForm.record,
					birth_date: animalForm.birth_date,
					weight: Number(animalForm.weight),
					sex: animalForm.gender as any,
					breeds_id: Number(animalForm.breeds_id),
					status: "Vivo",
				} as any);
			} else if (currentType === "user") {
				createdItem = await usersService.createUser({
					name: userForm.name || userForm.fullname,
					fullname: userForm.fullname,
					email: userForm.email,
					password: userForm.password,
					password_confirmation: userForm.password,
					role: userForm.role,
				} as any);
			} else if (currentType === "field") {
				createdItem = await fieldService.createField({
					name: fieldForm.name,
					capacity: Number(fieldForm.capacity),
					field_type: fieldForm.field_type,
					status: "Activo",
				} as any);
			} else if (currentType === "heat") {
				if (!heatForm.animal_id) throw new Error("Debe seleccionar un animal");
				if (heatForm.event_date && heatForm.event_date > getTodayColombia()) {
					throw new Error("La fecha del celo no puede ser futura");
				}
				createdItem = await reproductionService.create({
					animal_id: Number(heatForm.animal_id),
					event_type: "Celo",
					event_date: heatForm.event_date || getTodayColombia(),
					notes: heatForm.notes,
				} as any);
			}
			showToast("Operación realizada con éxito", "success");
			setSuccessItem(createdItem || { ok: true });
		} catch (err: any) {
			devLogger.error(err);
			showToast(err.message || "Error al realizar la operación", "error");
		} finally {
			setLoading(false);
		}
	};

	const getTitle = () => {
		if (successItem) return "Registro Creado";
		switch (currentType) {
			case "animal":
				return "Nuevo Animal";
			case "user":
				return "Nuevo Usuario";
			case "field":
				return "Nuevo Potrero";
			case "heat":
				return "Registrar Celo";
			default:
				return "";
		}
	};

	if (!currentType) return null;

	const modalTabs = (
		<div className="flex gap-1 overflow-x-auto p-1 bg-muted/40 rounded-lg mx-3 my-2">
			{quickModalList.map((item) => (
				<button
					key={item.type}
					type="button"
					onClick={() => handleSwitchType(item.type)}
					className={cn(
						"flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
						currentType === item.type
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground hover:bg-background/50"
					)}
				>
					{item.label}
				</button>
			))}
		</div>
	);

	return (
		<GenericModal
			isOpen={!!currentType}
			onOpenChange={(open) => !open && onClose()}
			title={getTitle()}
			size="md"
			tabs={modalTabs}
			enableNavigation
			hasPrevious={hasPrevType}
			hasNext={hasNextType}
			onNavigatePrevious={handlePrevType}
			onNavigateNext={handleNextType}
		>
			<div className="p-4">
				{successItem ? (
					<div className="space-y-4">
						<div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-xl text-center">
							El registro fue insertado correctamente en el sistema.
						</div>
						<div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-sm space-y-2">
							<h4 className="font-semibold text-foreground border-b border-border/50 pb-2 mb-2">
								Detalles del Registro
							</h4>
							{Object.entries(successItem)
								.filter(
									([k, v]) =>
										!["id", "created_at", "updated_at"].includes(k) &&
										typeof v !== "object",
								)
								.slice(0, 6)
								.map(([key, value]) => (
									<div key={key} className="flex justify-between">
										<span className="font-medium text-muted-foreground capitalize">
											{key.replace("_", " ")}:
										</span>
										<span className="text-foreground font-semibold">
											{String(value)}
										</span>
									</div>
								))}
						</div>
						<Button onClick={onClose} className="w-full mt-4">
							Continuar
						</Button>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						{currentType === "animal" && (
							<>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Registro/Código *
									</label>
									<Input
										required
										value={animalForm.record}
										onChange={(e) =>
											setAnimalForm({ ...animalForm, record: e.target.value })
										}
										placeholder="Ej: VACA-001"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Fecha de Nacimiento
									</label>
									<Input
										type="date"
										max={getTodayColombia()}
										value={animalForm.birth_date}
										onChange={(e) =>
											setAnimalForm({
												...animalForm,
												birth_date: e.target.value,
											})
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-semibold mb-1 block">
											Peso Inicial (kg) *
										</label>
										<Input
											required
											type="number"
											step="0.01"
											value={animalForm.weight}
											onChange={(e) =>
												setAnimalForm({ ...animalForm, weight: e.target.value })
											}
										/>
									</div>
									<div>
										<label className="text-xs font-semibold mb-1 block">
											Sexo *
										</label>
										<select
											required
											className="w-full px-3 py-2 border rounded-lg bg-form-select text-sm"
											value={animalForm.gender}
											onChange={(e) =>
												setAnimalForm({ ...animalForm, gender: e.target.value })
											}
										>
											<option value="Hembra">Hembra</option>
											<option value="Macho">Macho</option>
										</select>
									</div>
								</div>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Raza *
									</label>
									<select
										required
										className="w-full px-3 py-2 border rounded-lg bg-form-select text-sm"
										value={animalForm.breeds_id}
										onChange={(e) =>
											setAnimalForm({
												...animalForm,
												breeds_id: e.target.value,
											})
										}
									>
										<option value="">Seleccione una raza...</option>
										{breeds.map((b) => (
											<option key={b.id} value={b.id}>
												{b.name}
											</option>
										))}
									</select>
								</div>
							</>
						)}

						{currentType === "user" && (
							<>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Nombre Completo *
									</label>
									<Input
										required
										value={userForm.fullname}
										onChange={(e) =>
											setUserForm({
												...userForm,
												fullname: e.target.value,
												name: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Correo Electrónico *
									</label>
									<Input
										required
										type="email"
										value={userForm.email}
										onChange={(e) =>
											setUserForm({ ...userForm, email: e.target.value })
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-semibold mb-1 block">
											Contraseña *
										</label>
										<Input
											required
											type="password"
											value={userForm.password}
											onChange={(e) =>
												setUserForm({ ...userForm, password: e.target.value })
											}
										/>
									</div>
									<div>
										<label className="text-xs font-semibold mb-1 block">
											Rol *
										</label>
										<select
											required
											className="w-full px-3 py-2 border rounded-lg bg-form-select text-sm"
											value={userForm.role}
											onChange={(e) =>
												setUserForm({ ...userForm, role: e.target.value })
											}
										>
											<option value="Operator">Operador</option>
											<option value="Admin">Administrador</option>
											<option value="Veterinarian">Veterinario</option>
										</select>
									</div>
								</div>
							</>
						)}

						{currentType === "field" && (
							<>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Nombre del Potrero *
									</label>
									<Input
										required
										value={fieldForm.name}
										onChange={(e) =>
											setFieldForm({ ...fieldForm, name: e.target.value })
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-semibold mb-1 block">
											Capacidad (Animales) *
										</label>
										<Input
											required
											type="number"
											value={fieldForm.capacity}
											onChange={(e) =>
												setFieldForm({ ...fieldForm, capacity: e.target.value })
											}
										/>
									</div>
									<div>
										<label className="text-xs font-semibold mb-1 block">
											Tipo *
										</label>
										<select
											required
											className="w-full px-3 py-2 border rounded-lg bg-form-select text-sm"
											value={fieldForm.field_type}
											onChange={(e) =>
												setFieldForm({
													...fieldForm,
													field_type: e.target.value,
												})
											}
										>
											<option value="Pasto">Pasto</option>
											<option value="Corral">Corral</option>
											<option value="Cuarentena">Cuarentena</option>
										</select>
									</div>
								</div>
							</>
						)}

						{currentType === "heat" && (
							<>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Animal (Hembra) *
									</label>
									<select
										required
										className="w-full px-3 py-2 border rounded-lg bg-form-select text-sm"
										value={heatForm.animal_id}
										onChange={(e) =>
											setHeatForm({ ...heatForm, animal_id: e.target.value })
										}
									>
										<option value="">Seleccione un animal...</option>
										{femaleAnimals.map((a) => (
											<option key={a.id} value={a.id}>
												{a.record} - {a.name || ""}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Fecha del Celo *
									</label>
									<Input
										required
										type="date"
										max={getTodayColombia()}
										value={heatForm.event_date}
										onChange={(e) =>
											setHeatForm({ ...heatForm, event_date: e.target.value })
										}
									/>
								</div>
								<div>
									<label className="text-xs font-semibold mb-1 block">
										Notas
									</label>
									<Textarea
										value={heatForm.notes}
										onChange={(e) =>
											setHeatForm({ ...heatForm, notes: e.target.value })
										}
										rows={2}
									/>
								</div>
							</>
						)}

						<div className="flex justify-end gap-2 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={loading}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={loading}>
								{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								Guardar
							</Button>
						</div>
					</form>
				)}
			</div>
		</GenericModal>
	);
}
