import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail, MapPin, Phone, User } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ClimbingBoxLoader } from "react-spinners";
import { usersService } from "@/entities/user/api/user.service";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	type ProfileFormValues,
	profileSchema,
} from "../utils/profile.schemas";

interface ProfileFormProps {
	user: any;
	refreshUserData: () => Promise<void>;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
	user,
	refreshUserData,
}) => {
	const [updatingProfile, setUpdatingProfile] = useState(false);
	const [profileStatus, setProfileStatus] = useState<{
		type: "success" | "error" | "info";
		message: string;
	} | null>(null);

	const profileForm = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			fullname: user?.fullname || "",
			email: user?.email || "",
			phone: user?.phone || "",
			address: user?.address || "",
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = profileForm;

	useEffect(() => {
		if (user) {
			reset({
				fullname: user.fullname || "",
				email: user.email || "",
				phone: user.phone || "",
				address: user.address || "",
			});
		}
	}, [user, reset]);

	const handleProfileSubmit = async (values: ProfileFormValues) => {
		if (!user?.id) {
			setProfileStatus({
				type: "error",
				message: "No se pudo identificar el usuario.",
			});
			return;
		}

		setUpdatingProfile(true);
		setProfileStatus(null);

		try {
			const normalized = {
				fullname: values.fullname.trim(),
				email: values.email.trim(),
				phone: values.phone?.trim() || "",
				address: values.address?.trim() || "",
			};
			const payload = {
				fullname: normalized.fullname,
				email: normalized.email,
				phone: normalized.phone || undefined,
				address: normalized.address || undefined,
			};

			const updated = await usersService.patchUser(user.id, payload);
			const queued = (updated as any)?.__offlineQueued;
			setProfileStatus({
				type: "success",
				message: queued
					? "Actualizacion en cola (offline)."
					: "Perfil actualizado correctamente.",
			});
			profileForm.reset(normalized);
			if (refreshUserData) {
				await refreshUserData().catch(() => {});
			}
		} catch (error: any) {
			const payload =
				error?.response?.data ?? error?.data ?? error?.details ?? error;
			const message =
				error?.message ||
				payload?.message ||
				payload?.detail ||
				"No se pudo actualizar el perfil.";
			setProfileStatus({ type: "error", message });
		} finally {
			setUpdatingProfile(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(handleProfileSubmit)} className="space-y-6">
			{profileStatus && (
				<div
					className={`p-4 rounded-xl flex items-start gap-3 border ${
						profileStatus.type === "success"
							? "bg-success/5 border-success/30 text-success"
							: profileStatus.type === "error"
								? "bg-destructive/5 border-destructive/30 text-destructive"
								: "bg-info/5 border-info/30 text-info"
					}`}
				>
					{profileStatus.type === "success" && (
						<CheckCircle2 className="w-5 h-5 shrink-0" />
					)}
					<div className="flex-1">
						<p className="text-sm font-medium">{profileStatus.message}</p>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-2">
					<Label htmlFor="fullname">
						Nombre Completo <span className="text-destructive">*</span>
					</Label>
					<div className="relative group">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
							<User size={18} />
						</div>
						<Input
							id="fullname"
							{...register("fullname")}
							disabled={updatingProfile}
							className="pl-10 transition-all"
							placeholder="Ej: Juan Perez"
						/>
					</div>
					{errors.fullname && (
						<p className="text-xs text-destructive mt-1 font-medium">
							{errors.fullname.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="email">
						Correo Electrónico <span className="text-destructive">*</span>
					</Label>
					<div className="relative group">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
							<Mail size={18} />
						</div>
						<Input
							id="email"
							type="email"
							{...register("email")}
							disabled={updatingProfile}
							className="pl-10 transition-all"
							placeholder="juan@ejemplo.com"
						/>
					</div>
					{errors.email && (
						<p className="text-xs text-destructive mt-1 font-medium">
							{errors.email.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="phone">Celular</Label>
					<div className="relative group">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
							<Phone size={18} />
						</div>
						<Input
							id="phone"
							type="tel"
							{...register("phone")}
							disabled={updatingProfile}
							className="pl-10 transition-all"
							placeholder="+57 300 000 0000"
						/>
					</div>
					{errors.phone && (
						<p className="text-xs text-destructive mt-1 font-medium">
							{errors.phone.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="address">Vereda / Dirección</Label>
					<div className="relative group">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
							<MapPin size={18} />
						</div>
						<Input
							id="address"
							{...register("address")}
							disabled={updatingProfile}
							className="pl-10 h-12 bg-form-input/50 focus:bg-form-input transition-all"
							placeholder="Ej: Vereda El Centro"
						/>
					</div>
					{errors.address && (
						<p className="text-xs text-destructive mt-1 font-medium">
							{errors.address.message}
						</p>
					)}
				</div>
			</div>

			<div className="flex items-center justify-end pt-4 border-t border-border/40">
				<Button
					type="submit"
					disabled={updatingProfile}
					className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
				>
					{updatingProfile ? (
						<div className="flex items-center gap-2">
							<ClimbingBoxLoader color="#ffffff" size={6} />
							<span>Guardando...</span>
						</div>
					) : (
						"Guardar Cambios"
					)}
				</Button>
			</div>
		</form>
	);
};
