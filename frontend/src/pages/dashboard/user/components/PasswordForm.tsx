import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Info, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ClimbingBoxLoader } from "react-spinners";
import { useToast } from "@/app/providers/ToastContext";
import { changePassword } from "@/features/auth/api/auth.service";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { HelpTooltip } from "@/shared/ui/common/HelpTooltip";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { extractErrorMessage } from "../utils/profile.helpers";
import {
	type BubbleVariant,
	type PasswordFormValues,
	type PasswordStatus,
	passwordSchema,
} from "../utils/profile.schemas";

const PASSWORD_POLICY_HELP =
	"La nueva contraseña debe tener mínimo 8 caracteres e incluir al menos 1 mayúscula y 1 minúscula. Ejemplo: Abcdefgh";

export const BubbleMessage = ({
	message,
	variant = "error",
}: {
	message: string;
	variant?: BubbleVariant;
}) => {
	const variants: Record<BubbleVariant, { wrapper: string; arrow: string }> = {
		success: {
			wrapper: "border-success/30 bg-success/5 text-success",
			arrow: "border-success/30 bg-success/5",
		},
		error: {
			wrapper: "border-destructive/30 bg-destructive/5 text-destructive",
			arrow: "border-destructive/30 bg-destructive/5",
		},
		info: {
			wrapper: "border-info/30 bg-info/5 text-info",
			arrow: "border-info/30 bg-info/5",
		},
		warning: {
			wrapper: "border-yellow-200 bg-warning/5 text-warning",
			arrow: "border-yellow-200 bg-warning/5",
		},
	};
	const styles = variants[variant];
	return (
		<div
			role="alert"
			className={`relative mt-2 rounded-lg border px-3 py-2 text-sm shadow-sm ${styles.wrapper}`}
		>
			<span
				aria-hidden="true"
				className={`absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t ${styles.arrow}`}
			/>
			{message}
		</div>
	);
};

export const PasswordLiveRequirements = ({
	newPassword,
	confirmPassword,
}: {
	newPassword: string;
	confirmPassword: string;
}) => {
	const lengthOk = newPassword.length >= 8;
	const uppercaseOk = /[A-Z]/.test(newPassword);
	const lowercaseOk = /[a-z]/.test(newPassword);
	const matchOk =
		!!newPassword && !!confirmPassword && newPassword === confirmPassword;

	const Item = ({ ok, text }: { ok: boolean; text: string }) => (
		<div
			className={`flex items-start gap-2 text-sm ${ok ? "text-success" : "text-muted-foreground"}`}
		>
			{ok ? (
				<CheckCircle2 className="h-4 w-4 mt-0.5" aria-hidden />
			) : (
				<AlertTriangle className="h-4 w-4 mt-0.5" aria-hidden />
			)}
			<span>{text}</span>
		</div>
	);

	return (
		<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
			<Item ok={lengthOk} text="Mínimo 8 caracteres" />
			<Item ok={uppercaseOk} text="Incluye 1 mayúscula" />
			<Item ok={lowercaseOk} text="Incluye 1 minúscula" />
			<Item ok={matchOk} text="Confirmación coincide" />
		</div>
	);
};

export const PasswordForm = ({ logout }: { logout: () => void }) => {
	const { showToast } = useToast();
	const [updatingPassword, setUpdatingPassword] = useState(false);
	const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(
		null,
	);
	const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);

	const passwordForm = useForm<PasswordFormValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = passwordForm;

	const newPasswordValue = watch("newPassword");
	const confirmPasswordValue = watch("confirmPassword");

	useEffect(() => {
		if (logoutCountdown == null) return;
		if (logoutCountdown <= 0) {
			setLogoutCountdown(null);
			Promise.resolve(logout()).catch(() => {});
			return;
		}
		const t = setTimeout(
			() => setLogoutCountdown((prev) => (prev == null ? null : prev - 1)),
			1000,
		);
		return () => clearTimeout(t);
	}, [logoutCountdown, logout]);

	const handlePasswordSubmit = async (values: PasswordFormValues) => {
		setUpdatingPassword(true);
		setPasswordStatus(null);
		setLogoutCountdown(null);
		passwordForm.clearErrors();

		try {
			const result = await changePassword(
				values.currentPassword,
				values.newPassword,
			);
			const okMessage =
				result?.message || "Contraseña actualizada correctamente.";

			if (result?.should_clear_auth) {
				const msg =
					result?.message ||
					"Contraseña actualizada. Por seguridad debes iniciar sesión nuevamente.";
				setPasswordStatus({
					type: "info",
					title: "Vuelve a iniciar sesión",
					message: `${msg} Cerraremos tu sesión en unos segundos para proteger tu cuenta.`,
				});
				showToast(msg, "info", 9000);
				passwordForm.reset({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
				setLogoutCountdown(3);
				return;
			}

			showToast(okMessage, "success");
			setPasswordStatus({
				type: "success",
				title: "Listo",
				message: okMessage,
			});
			passwordForm.reset({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (error: any) {
			const status = error?.response?.status ?? error?.status;
			const payload =
				error?.response?.data ?? error?.details ?? error?.data ?? error;
			const block = payload?.error ?? payload;
			const responseErrors =
				block?.errors ??
				block?.data?.errors ??
				block?.data?.data?.errors ??
				block?.details?.errors ??
				block?.details?.data?.errors ??
				block?.validation_errors ??
				block?.data?.validation_errors ??
				block?.data?.data?.validation_errors ??
				block?.details?.validation_errors ??
				block?.details?.data?.validation_errors ??
				payload?.errors ??
				payload?.details?.errors;

			const fieldMap: Record<string, keyof PasswordFormValues> = {
				current_password: `currentPassword`,
				new_password: `newPassword`,
				confirm_password: `confirmPassword`,
				currentPassword: `currentPassword`,
				newPassword: `newPassword`,
				confirmPassword: `confirmPassword`,
			};

			if (responseErrors && typeof responseErrors === "object") {
				Object.entries(responseErrors).forEach(([field, value]) => {
					const uiField = fieldMap[field];
					if (!uiField) return;
					const messages = Array.isArray(value) ? value : [value];
					const message = messages
						.map((item: any) =>
							typeof item === "string"
								? item
								: item?.message || item?.detail || item,
						)
						.filter(Boolean)
						.join(" ");
					if (message) passwordForm.setError(uiField, { message });
				});
			}

			const message = extractErrorMessage(error);
			const normalized = String(message || "").toLowerCase();
			const hasNewPasswordError = !!(
				responseErrors &&
				typeof responseErrors === "object" &&
				("new_password" in responseErrors || "newPassword" in responseErrors)
			);
			const hasCurrentPasswordError = !!(
				responseErrors &&
				typeof responseErrors === "object" &&
				("current_password" in responseErrors ||
					"currentPassword" in responseErrors)
			);
			const isGenericValidation =
				normalized.includes("errores de validación") ||
				normalized.includes("validation error") ||
				normalized.trim() === "validation";

			if (status === 422) {
				setPasswordStatus({
					type: "warning",
					title: "Revisa los campos",
					message:
						message ||
						"Errores de validación. Ajusta los campos según los requisitos.",
				});
				showToast(
					message || "Errores de validación. Revisa los campos.",
					"warning",
					8000,
				);
				if (
					hasNewPasswordError ||
					normalized.includes("contras") ||
					normalized.includes("password") ||
					normalized.includes("new_password")
				) {
					if (!hasNewPasswordError && !isGenericValidation && message) {
						passwordForm.setError("newPassword", { message });
					}
				} else if (
					!hasCurrentPasswordError &&
					normalized.includes("actual") &&
					!isGenericValidation &&
					message
				) {
					passwordForm.setError("currentPassword", { message });
				}
			} else if (status === 401) {
				const isCsrf = normalized.includes("csrf");
				setPasswordStatus({
					type: "error",
					title: isCsrf ? "Sesión expirada" : "No autorizado",
					message:
						message ||
						(isCsrf
							? "Sesión expirada o CSRF inválido. Recarga e intenta nuevamente."
							: "Verifica tu contraseña actual."),
				});
				showToast(
					message ||
						(isCsrf
							? "Sesión expirada o CSRF inválido. Recarga e intenta nuevamente."
							: "Verifica tu contraseña actual."),
					"error",
					9000,
				);
				if (!responseErrors && normalized.includes("actual")) {
					passwordForm.setError("currentPassword", {
						message: message || "Contraseña actual incorrecta.",
					});
				}
			} else if (status === 403) {
				setPasswordStatus({
					type: "error",
					title: "Acceso denegado",
					message: message || "Usuario inactivo. Contacta al administrador.",
				});
				showToast(message || "Usuario inactivo.", "error", 9000);
			} else if (status === 404) {
				setPasswordStatus({
					type: "error",
					title: "No encontrado",
					message: message || "Usuario no encontrado.",
				});
				showToast(message || "Usuario no encontrado.", "error", 9000);
			} else if (status === 429) {
				setPasswordStatus({
					type: "warning",
					title: "Demasiados intentos",
					message: message || "Intenta nuevamente más tarde.",
				});
				showToast(message || "Demasiados intentos.", "warning", 9000);
			} else if (!status) {
				setPasswordStatus({
					type: "error",
					title: "Sin conexión",
					message: message || "No se pudo conectar con el servidor.",
				});
				showToast(
					message || "No se pudo conectar con el servidor.",
					"error",
					9000,
				);
			} else {
				setPasswordStatus({
					type: "error",
					title: "Error",
					message: message || "No se pudo actualizar la contraseña.",
				});
				showToast(
					message || "No se pudo actualizar la contraseña.",
					"error",
					9000,
				);
			}
		} finally {
			setUpdatingPassword(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(handlePasswordSubmit)} className="space-y-6">
			{passwordStatus && (
				<Alert
					variant={passwordStatus.type === "error" ? "destructive" : "default"}
					className={
						passwordStatus.type === "success"
							? "border-success/50 bg-success/10 text-success"
							: passwordStatus.type === "info"
								? "border-info/50 bg-info/10 text-info"
								: passwordStatus.type === "warning"
									? "border-warning/50 bg-warning/10 text-warning"
									: ""
					}
				>
					<div className="flex items-center gap-2">
						{passwordStatus.type === "info" && <Info className="h-4 w-4" />}
						{passwordStatus.type === "success" && (
							<CheckCircle2 className="h-4 w-4" />
						)}
						{(passwordStatus.type === "error" ||
							passwordStatus.type === "warning") && (
							<AlertTriangle className="h-4 w-4" />
						)}
						<AlertTitle>{passwordStatus.title}</AlertTitle>
					</div>
					<AlertDescription>
						{passwordStatus.message}
						{logoutCountdown !== null && (
							<span className="block mt-2 font-bold text-lg animate-pulse">
								Cerrando en {logoutCountdown}s...
							</span>
						)}
					</AlertDescription>
				</Alert>
			)}
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="currentPassword">Contraseña Actual</Label>
					<Input
						id="currentPassword"
						type="password"
						{...register("currentPassword")}
						disabled={updatingPassword || logoutCountdown !== null}
						className="w-full"
						placeholder="Ingresa tu contraseña actual"
					/>
					{errors.currentPassword && (
						<BubbleMessage
							message={errors.currentPassword.message as string}
							variant="error"
						/>
					)}
				</div>
				<div className="space-y-2 pt-2 border-t border-border/40">
					<div className="flex items-center gap-2">
						<Label htmlFor="newPassword">Nueva Contraseña</Label>
						<HelpTooltip content={PASSWORD_POLICY_HELP} />
					</div>
					<Input
						id="newPassword"
						type="password"
						{...register("newPassword")}
						disabled={updatingPassword || logoutCountdown !== null}
						className="w-full"
						placeholder="Crea una nueva contraseña"
					/>
					{errors.newPassword && (
						<BubbleMessage
							message={errors.newPassword.message as string}
							variant="error"
						/>
					)}
					{(newPasswordValue || confirmPasswordValue) && (
						<PasswordLiveRequirements
							newPassword={newPasswordValue}
							confirmPassword={confirmPasswordValue}
						/>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
					<Input
						id="confirmPassword"
						type="password"
						{...register("confirmPassword")}
						disabled={updatingPassword || logoutCountdown !== null}
						className="w-full"
						placeholder="Repite la nueva contraseña"
					/>
					{errors.confirmPassword && (
						<BubbleMessage
							message={errors.confirmPassword.message as string}
							variant="error"
						/>
					)}
				</div>
			</div>
			<Button
				type="submit"
				disabled={updatingPassword || logoutCountdown !== null}
				className="w-full sm:w-auto mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
			>
				{updatingPassword ? (
					<>
						<ClimbingBoxLoader color="#ffffff" size={6} />
						<span>Actualizando...</span>
					</>
				) : (
					<>
						<Shield className="w-4 h-4" />
						<span>Cambiar Contraseña</span>
					</>
				)}
			</Button>
		</form>
	);
};
