import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useState, useEffect } from "react";
import { resetPassword } from '@/features/auth/api/auth.service';
import { FaLock, FaCheckCircle, FaArrowLeft } from "react-icons/fa";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ClimbingBoxLoader } from "react-spinners";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const resetToken = searchParams.get("token") || searchParams.get("reset_token");

    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resolveErrorMessage = (err: any): string => {
        const raw =
            err?.message ||
            err?.response?.data?.message ||
            err?.response?.data?.detail ||
            err?.response?.data?.error;
        const message = typeof raw === "string" ? raw : "";
        const normalized = message.toLowerCase();
        if (normalized.includes("token") && (normalized.includes("ausente") || normalized.includes("missing"))) {
            return "El enlace de restablecimiento no es válido o ya expiró. Solicita uno nuevo.";
        }
        if (normalized.includes("csrf")) {
            return "No pudimos validar el enlace. Solicita uno nuevo.";
        }
        if (normalized.includes("expir")) {
            return "El enlace de restablecimiento expiró. Solicita uno nuevo.";
        }
        return message || "Ocurrio un error al procesar tu solicitud. El token pudo expirar.";
    };

    useEffect(() => {
        if (!resetToken) {
            setError("El enlace de restablecimiento no es valido o ya expiro. Solicita uno nuevo.");
        }
    }, [resetToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!resetToken) {
            setError("No se puede restablecer la contraseña sin un token válido.");
            return;
        }

        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await resetPassword(resetToken, password);
            const needsRelogin = response?.should_clear_auth ? " Debes iniciar sesión nuevamente." : "";
            setSuccessMessage(response.message || `Tu contraseña ha sido restablecida con éxito.${needsRelogin}`);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err: any) {
            setError(resolveErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-[100dvh] overflow-y-auto bg-gradient-to-br from-green-50 to-green-100 p-4">
            {loading ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                    <ClimbingBoxLoader color="#10B981" loading={loading} size={15} />
                </div>
            ) : (
                <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
                    <div className="flex items-center justify-between">
                        <Link to="/login" className="text-success hover:text-success flex items-center gap-2 text-sm font-medium">
                            <FaArrowLeft /> Volver al login
                        </Link>
                    </div>

                    <h2 className="text-3xl font-bold text-center text-success">
                        Nueva contraseña
                    </h2>

                    {successMessage ? (
                        <Alert className="bg-success/5 border-success/30">
                            <FaCheckCircle className="h-5 w-5 text-success" />
                            <AlertTitle className="text-success font-medium">¡Éxito!</AlertTitle>
                            <AlertDescription className="text-success">
                                {successMessage} Redirigiendo al inicio de sesión...
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            <p className="text-muted-foreground text-center text-sm">
                                Establece una nueva contraseña segura para tu cuenta.
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-success">
                                    Nueva contraseña
                                </Label>
                                <div className="relative">
                                    <span className="absolute text-muted-foreground inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock />
                                    </span>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError(null);
                                        }}
                                        className={`w-full px-10 py-2 border ${error && !resetToken ? 'border-red-400 focus:ring-red-400' : 'border-success/40 focus:ring-green-500'} rounded-md focus:outline-none focus:ring-1`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-success">
                                    Confirmar nueva contraseña
                                </Label>
                                <div className="relative">
                                    <span className="absolute text-muted-foreground inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock />
                                    </span>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setError(null);
                                        }}
                                        className={`w-full px-10 py-2 border ${error && password !== confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-success/40 focus:ring-green-500'} rounded-md focus:outline-none focus:ring-1`}
                                    />
                                </div>
                                {error && (
                                    <div
                                        role="alert"
                                        className="relative mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow-sm"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t border-destructive/30 bg-destructive/5"
                                        />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || !resetToken}
                                className="w-full py-2 px-4 bg-success hover:bg-green-700 focus:ring-green-500 focus:ring-offset-green-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Restablecer contraseña
                            </Button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResetPassword;
