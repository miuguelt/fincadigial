import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { HelpTooltip } from '@/shared/ui/common/HelpTooltip';
import { ClimbingBoxLoader } from 'react-spinners';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { usersService } from '@/entities/user/api/user.service';
import { changePassword } from '@/features/auth/api/auth.service';
import { Mail, Phone, MapPin, UserCircle, Shield, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { ProfessionalCredentialSection } from './components/ProfessionalCredentialSection';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { JoinFincaForm } from '@/features/membership/ui/JoinFincaForm';
import { useMultiFinca } from '@/features/multi-finca/model/useMultiFinca';
import { UserActivityCard } from './components/UserActivityCard';
import { PasswordLiveRequirements } from './components/PasswordLiveRequirements';

const profileSchema = z.object({
    fullname: z.string().min(3, 'Ingresa al menos 3 caracteres').max(120, 'Nombre demasiado largo'),
    email: z.string().email('Correo electrónico inválido'),
    phone: z.string().optional().refine((value) => !value || /^[0-9+()\\-\\s]{7,20}$/.test(value), 'Teléfono inválido'),
    address: z.string().max(160, 'Dirección demasiado larga').optional(),
});

const passwordSchema = z
    .object({
        currentPassword: z.string().min(4, 'Ingresa tu contraseña actual'),
        newPassword: z
            .string()
            .min(8, 'La contraseña debe tener al menos 8 caracteres')
            .superRefine((value, ctx) => {
                const hasUppercase = /[A-Z]/.test(value);
                const hasLowercase = /[a-z]/.test(value);

                if (!hasUppercase || !hasLowercase) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Debe incluir al menos 1 mayúscula y 1 minúscula.',
                    });
                }
            }),
        confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Las contraseñas no coinciden',
                path: ['confirmPassword'],
            });
        }
    });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

type BubbleVariant = 'success' | 'error' | 'info' | 'warning';

const PASSWORD_POLICY_HELP = 'La nueva contraseña debe tener mínimo 8 caracteres e incluir al menos 1 mayúscula y 1 minúscula. Ejemplo: Abcdefgh';

const BubbleMessage = ({ message, variant = 'error' }: { message: string; variant?: BubbleVariant }) => {
    const variants: Record<BubbleVariant, { wrapper: string; arrow: string }> = {
        success: { wrapper: 'border-success/30 bg-success/5 text-success', arrow: 'border-success/30 bg-success/5' },
        error: { wrapper: 'border-destructive/30 bg-destructive/5 text-destructive', arrow: 'border-destructive/30 bg-destructive/5' },
        info: { wrapper: 'border-info/30 bg-info/5 text-info', arrow: 'border-info/30 bg-info/5' },
        warning: { wrapper: 'border-yellow-200 bg-warning/5 text-warning', arrow: 'border-yellow-200 bg-warning/5' },
    };
    const styles = variants[variant];
    return (
        <div role="alert" className={`relative mt-2 rounded-lg border px-3 py-2 text-sm shadow-sm ${styles.wrapper}`}>
            <span aria-hidden="true" className={`absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t ${styles.arrow}`} />
            {message}
        </div>
    );
};

type PasswordStatus = {
    type: BubbleVariant;
    title: string;
    message: string;
};

const UserProfile = () => {
    const { user, loading: authLoading, refreshUserData, logout } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { switchFinca, switching } = useMultiFinca();
    const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(null);
    const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [joinFincaModalOpen, setJoinFincaModalOpen] = useState(false);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullname: user?.fullname || '',
            email: user?.email || '',
            phone: user?.phone || '',
            address: user?.address || '',
        },
    });
    const { reset } = profileForm;

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const extractErrorMessage = (error: any): string => {
        const payload = error?.response?.data ?? error?.details ?? error?.data ?? error;
        const block = payload?.error ?? payload;
        const fromErrorsObject = (errors: any): string | undefined => {
            if (!errors) return undefined;
            if (Array.isArray(errors)) {
                const messages = errors.map((item) => (typeof item === 'string' ? item : item?.message || item?.detail || item)).filter(Boolean);
                return messages.length ? messages.join(' ') : undefined;
            }
            if (typeof errors === 'object') {
                const messages = Object.values(errors)
                    .flatMap((item) => (Array.isArray(item) ? item : [item]))
                    .map((item) => (typeof item === 'string' ? item : item?.message || item?.detail || item))
                    .filter(Boolean);
                return messages.length ? messages.join(' ') : undefined;
            }
            return undefined;
        };
        const errors =
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
        return (
            fromErrorsObject(errors) ||
            block?.message ||
            block?.detail ||
            block?.error ||
            payload?.message ||
            payload?.detail ||
            error?.message ||
            'No se pudo actualizar la contraseña.'
        );
    };

    const currentPasswordValue = passwordForm.watch('currentPassword');
    const newPasswordValue = passwordForm.watch('newPassword');
    const confirmPasswordValue = passwordForm.watch('confirmPassword');

    useEffect(() => {
        if (logoutCountdown == null) return;
        if (logoutCountdown <= 0) {
            setLogoutCountdown(null);
            Promise.resolve(logout()).catch(() => { });
            return;
        }
        const t = setTimeout(() => setLogoutCountdown((prev) => (prev == null ? null : prev - 1)), 1000);
        return () => clearTimeout(t);
    }, [logoutCountdown, logout]);
    useEffect(() => {
        if (user) {
            reset({
                fullname: user.fullname || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
            });
        }
    }, [user, reset]);

    const handleProfileSubmit = async (values: ProfileFormValues) => {
        if (!user?.id) {
            setProfileStatus({ type: 'error', message: 'No se pudo identificar el usuario.' });
            return;
        }

        setUpdatingProfile(true);
        setProfileStatus(null);

        try {
            const normalized = {
                fullname: values.fullname.trim(),
                email: values.email.trim(),
                phone: values.phone?.trim() || '',
                address: values.address?.trim() || '',
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
                type: 'success',
                message: queued ? 'Actualización en cola para sincronizar.' : 'Perfil actualizado correctamente.',
            });
            profileForm.reset(normalized);
            if (refreshUserData) {
                await refreshUserData().catch(() => { });
            }
        } catch (error: any) {
            const payload = error?.response?.data ?? error?.data ?? error?.details ?? error;
            const message = error?.message || payload?.message || payload?.detail || 'No se pudo actualizar el perfil.';
            setProfileStatus({ type: 'error', message });
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handlePasswordSubmit = async (values: PasswordFormValues) => {
        setUpdatingPassword(true);
        setPasswordStatus(null);
        setLogoutCountdown(null);
        passwordForm.clearErrors();

        try {
            const result = await changePassword(values.currentPassword, values.newPassword);
            const okMessage = result?.message || 'Contraseña actualizada correctamente.';

            if (result?.should_clear_auth) {
                const msg = result?.message || 'Contraseña actualizada. Por seguridad debes iniciar sesión nuevamente.';
                setPasswordStatus({
                    type: 'info',
                    title: 'Vuelve a iniciar sesión',
                    message: `${msg} Cerraremos tu sesión en unos segundos para proteger tu cuenta.`,
                });
                showToast(msg, 'info', 9000);
                passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setLogoutCountdown(3);
                return;
            }

            showToast(okMessage, 'success');
            setPasswordStatus({ type: 'success', title: 'Listo', message: okMessage });
            passwordForm.reset({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            const status = error?.response?.status ?? error?.status;
            const payload = error?.response?.data ?? error?.details ?? error?.data ?? error;
            const block = payload?.error ?? payload;
            const errors =
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

            if (errors && typeof errors === 'object') {
                Object.entries(errors).forEach(([field, value]) => {
                    const uiField = fieldMap[field];
                    if (!uiField) return;
                    const messages = Array.isArray(value) ? value : [value];
                    const message = messages
                        .map((item: any) => (typeof item === 'string' ? item : item?.message || item?.detail || item))
                        .filter(Boolean)
                        .join(' ');
                    if (message) passwordForm.setError(uiField, { message });
                });
            }

            const message = extractErrorMessage(error);
            const normalized = String(message || '').toLowerCase();
            const hasNewPasswordError = !!(errors && typeof errors === 'object' && ('new_password' in errors || 'newPassword' in errors));
            const hasCurrentPasswordError = !!(errors && typeof errors === 'object' && ('current_password' in errors || 'currentPassword' in errors));
            const isGenericValidation =
                normalized.includes('errores de validacion') ||
                normalized.includes('validation error') ||
                normalized.trim() === 'validation';

            if (status === 422) {
                setPasswordStatus({
                    type: 'warning',
                    title: 'Revisa los campos',
                    message: message || 'Errores de validacion. Ajusta los campos segun los requisitos.',
                });
                showToast(message || 'Errores de validacion. Revisa los campos.', 'warning', 8000);
                if (hasNewPasswordError || normalized.includes('contras') || normalized.includes('password') || normalized.includes('new_password')) {
                    if (!hasNewPasswordError && !isGenericValidation && message) {
                        passwordForm.setError('newPassword', { message });
                    }
                } else if (!hasCurrentPasswordError && normalized.includes('actual') && !isGenericValidation && message) {
                    passwordForm.setError('currentPassword', { message });
                }
            } else if (status === 401) {
                const isCsrf = normalized.includes('csrf');
                setPasswordStatus({
                    type: 'error',
                    title: isCsrf ? 'Sesión expirada' : 'No autorizado',
                    message:
                        message ||
                        (isCsrf
                            ? 'Sesión expirada o CSRF inválido. Recarga la página e intenta nuevamente.'
                            : 'No autorizado. Verifica tu contraseña actual.'),
                });
                showToast(message || (isCsrf ? 'Sesión expirada o CSRF inválido. Recarga la página e intenta nuevamente.' : 'No autorizado. Verifica tu contraseña actual.'), 'error', 9000);
                if (!errors && normalized.includes('actual')) {
                    passwordForm.setError('currentPassword', { message: message || 'Contraseña actual incorrecta.' });
                }
            } else if (status === 403) {
                setPasswordStatus({
                    type: 'error',
                    title: 'Acceso denegado',
                    message: message || 'Usuario inactivo. Contacta al administrador.',
                });
                showToast(message || 'Usuario inactivo. Contacta al administrador.', 'error', 9000);
            } else if (status === 404) {
                setPasswordStatus({
                    type: 'error',
                    title: 'No encontrado',
                    message: message || 'Usuario no encontrado.',
                });
                showToast(message || 'Usuario no encontrado.', 'error', 9000);
            } else if (status === 429) {
                setPasswordStatus({
                    type: 'warning',
                    title: 'Demasiados intentos',
                    message: message || 'Demasiados intentos. Intenta nuevamente mas tarde.',
                });
                showToast(message || 'Demasiados intentos. Intenta nuevamente mas tarde.', 'warning', 9000);
            } else if (!status) {
                setPasswordStatus({
                    type: 'error',
                    title: 'Sin conexión',
                    message: message || 'No se pudo conectar con el servidor. Verifica tu conexión o el proxy.',
                });
                showToast(message || 'No se pudo conectar con el servidor. Verifica tu conexión o el proxy.', 'error', 9000);
            } else {
                setPasswordStatus({
                    type: 'error',
                    title: 'No se pudo actualizar',
                    message: message || 'No se pudo actualizar la contraseña.',
                });
                showToast(message || 'No se pudo actualizar la contraseña.', 'error', 9000);
            }
        } finally {
            setUpdatingPassword(false);
        }
    };

    // En /auth/me cada item de `fincas` es una membresía: el id de la finca es
    // `finca_id`, mientras que `id` corresponde al registro de membresía.
    const userMemberships = useMemo(() => {
        const memberships = (user as any)?.fincas;
        if (!Array.isArray(memberships)) return [];
        return memberships
            .map((membership: any) => {
                const fincaId = Number(membership?.finca_id ?? membership?.id);
                return {
                    key: String(membership?.id ?? fincaId),
                    fincaId,
                    name: membership?.finca_name || membership?.name || `Finca #${fincaId}`,
                    role: membership?.role || 'Sin rol asignado',
                    isActive: Number(user?.finca_id) === fincaId,
                };
            })
            .filter((membership) => Number.isFinite(membership.fincaId));
    }, [user]);

    if (authLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <ClimbingBoxLoader color="#16a34a" size={30} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full p-4 md:p-8">
                <p className="text-sm text-muted-foreground">No se pudo cargar el perfil.</p>
            </div>
        );
    }

    return (
        <div className="min-h-full w-full p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden animate-in fade-in duration-500" tabIndex={0}>
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-full">
                        <UserCircle className="w-12 h-12 text-success" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{user.fullname}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {user.role}
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="px-4 py-1 text-sm bg-success/5 text-success border-success/30">
                    Perfil de Usuario
                </Badge>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <CollapsibleCard
                    title="Información Personal"
                    accent="emerald"
                    defaultCollapsed={true}
                    className="lg:col-span-1"
                >
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Identificación</p>
                            <p className="font-medium">{user.identification}</p>
                        </div>
                        <div className="space-y-1 border-t pt-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Correo electrónico
                            </p>
                            <p className="font-medium fit-clamp">{user.email}</p>
                        </div>
                        {user.phone && (
                            <div className="space-y-1 border-t pt-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Teléfono
                                </p>
                                <p className="font-medium">{user.phone}</p>
                            </div>
                        )}
                        {user.address && (
                            <div className="space-y-1 border-t pt-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Dirección
                                </p>
                                <p className="font-medium">{user.address}</p>
                            </div>
                        )}
                    </div>
                </CollapsibleCard>

                {/* La acreditación solo aplica al rol que firma diagnósticos y
                    tratamientos; pedir matrícula a los demás roles recolectaría
                    datos personales sin finalidad. */}
                {user.role === 'Veterinario' && (
                    <ProfessionalCredentialSection className="lg:col-span-3" />
                )}

                <UserActivityCard user={user} navigate={navigate} className="lg:col-span-2" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CollapsibleCard
                    title="Actualiza tus datos"
                    accent="emerald"
                    defaultCollapsed={false}
                >
                    <div className="space-y-4">
                        {profileStatus && (
                            <Alert className={profileStatus.type === 'error' ? 'bg-destructive/5 border-destructive/30' : 'bg-success/5 border-success/30'}>
                                <AlertTitle className="font-semibold">{profileStatus.type === 'error' ? 'Error' : 'Datos guardados'}</AlertTitle>
                                <AlertDescription>{profileStatus.message}</AlertDescription>
                            </Alert>
                        )}
                        <p className="text-sm text-muted-foreground">Actualiza tu información de contacto sin abandonar tu perfil.</p>
                        <Button type="button" onClick={() => setProfileModalOpen(true)} className="w-full sm:w-auto">
                            Editar datos personales
                        </Button>
                        <GenericModal
                            isOpen={profileModalOpen}
                            onOpenChange={setProfileModalOpen}
                            title="Actualizar datos personales"
                            description="Los cambios se reflejarán en tu perfil al guardar."
                            size="2xl"
                        >
                        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullname">Nombre completo</Label>
                                <Input
                                    id="fullname"
                                    placeholder="Nombre y apellidos"
                                    {...profileForm.register('fullname')}
                                    className={profileForm.formState.errors.fullname ? 'border-red-400 focus:ring-red-400' : ''}
                                />
                                {profileForm.formState.errors.fullname && (
                                    <p className="text-sm text-destructive">{profileForm.formState.errors.fullname.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="correo@dominio.com"
                                    {...profileForm.register('email')}
                                    className={profileForm.formState.errors.email ? 'border-red-400 focus:ring-red-400' : ''}
                                />
                                {profileForm.formState.errors.email && (
                                    <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        placeholder="Ej: +57 3001234567"
                                        {...profileForm.register('phone')}
                                        className={profileForm.formState.errors.phone ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {profileForm.formState.errors.phone && (
                                        <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Dirección</Label>
                                    <Input
                                        id="address"
                                        placeholder="Barrio, ciudad"
                                        {...profileForm.register('address')}
                                        className={profileForm.formState.errors.address ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {profileForm.formState.errors.address && (
                                        <p className="text-sm text-destructive">{profileForm.formState.errors.address.message}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                <p className="text-xs text-muted-foreground">Se envía usando axios con credenciales y encabezado CSRF desde las cookies.</p>
                                <Button type="submit" disabled={updatingProfile} className="min-w-[160px]">
                                    {updatingProfile ? 'Guardando...' : 'Guardar cambios'}
                                </Button>
                            </div>
                        </form>
                        </GenericModal>
                    </div>
                </CollapsibleCard>

                <CollapsibleCard
                    title="Seguridad y contraseña"
                    accent="emerald"
                    defaultCollapsed={false}
                >
                    <div className="space-y-4">
                        {passwordStatus && (
                            <Alert
                                className={
                                    passwordStatus.type === 'success'
                                        ? 'bg-success/5 border-success/30'
                                        : passwordStatus.type === 'warning'
                                            ? 'bg-warning/5 border-yellow-200'
                                            : passwordStatus.type === 'info'
                                                ? 'bg-info/5 border-info/30'
                                                : 'bg-destructive/5 border-destructive/30'
                                }
                            >
                                <AlertTitle className="font-semibold flex items-center gap-2">
                                    {passwordStatus.type === 'success' ? (
                                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                                    ) : passwordStatus.type === 'warning' ? (
                                        <AlertTriangle className="h-4 w-4" aria-hidden />
                                    ) : (
                                        <Info className="h-4 w-4" aria-hidden />
                                    )}
                                    {passwordStatus.title}
                                </AlertTitle>
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <p>{passwordStatus.message}</p>
                                        {logoutCountdown != null && (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                                                <p className="text-sm">
                                                    Cerrando sesión en <span className="font-semibold">{logoutCountdown}s</span>...
                                                </p>
                                                <Button type="button" variant="outline" size="sm" onClick={() => Promise.resolve(logout()).catch(() => { })}>
                                                    Cerrar sesión ahora
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                        <p className="text-sm text-muted-foreground">Cambia tu contraseña desde un formulario seguro y enfocado.</p>
                        <Button type="button" onClick={() => setPasswordModalOpen(true)} className="w-full sm:w-auto">
                            Actualizar contraseña
                        </Button>
                        <GenericModal
                            isOpen={passwordModalOpen}
                            onOpenChange={setPasswordModalOpen}
                            title="Seguridad y contraseña"
                            description="Completa los requisitos antes de confirmar el cambio."
                            size="2xl"
                        >
                        <form
                            onSubmit={passwordForm.handleSubmit(handlePasswordSubmit, () =>
                                showToast('Revisa los campos antes de continuar.', 'warning', 6000)
                            )}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                name="username"
                                autoComplete="username"
                                value={user.email || user.identification || ''}
                                readOnly
                                tabIndex={-1}
                                aria-hidden="true"
                                className="hidden"
                            />

                            {(!!currentPasswordValue || !!newPasswordValue || !!confirmPasswordValue) && (
                                <Alert className="bg-warning/5 border-yellow-200">
                                    <AlertTitle className="font-semibold flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" aria-hidden />
                                        Requisitos de contraseña
                                    </AlertTitle>
                                    <AlertDescription className="text-sm">
                                        <p>Actual: 4+ caracteres. Nueva: mínimo 8 caracteres e incluye al menos 1 mayúscula y 1 minúscula.</p>
                                        <PasswordLiveRequirements newPassword={newPasswordValue || ''} confirmPassword={confirmPasswordValue || ''} />
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Contraseña actual</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    {...passwordForm.register('currentPassword')}
                                    className={passwordForm.formState.errors.currentPassword ? 'border-red-400 focus:ring-red-400' : ''}
                                />
                                {passwordForm.formState.errors.currentPassword?.message && (
                                    <BubbleMessage message={passwordForm.formState.errors.currentPassword.message} variant="error" />
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="flex items-center gap-2">
                                        Nueva contraseña
                                        <HelpTooltip content={PASSWORD_POLICY_HELP} side="right" />
                                    </Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        {...passwordForm.register('newPassword')}
                                        className={passwordForm.formState.errors.newPassword ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {passwordForm.formState.errors.newPassword?.message && (
                                        <BubbleMessage message={passwordForm.formState.errors.newPassword.message} variant="error" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        {...passwordForm.register('confirmPassword')}
                                        className={passwordForm.formState.errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}
                                    />
                                    {passwordForm.formState.errors.confirmPassword?.message && (
                                        <BubbleMessage message={passwordForm.formState.errors.confirmPassword.message} variant="error" />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                <p className="text-xs text-muted-foreground">Si el backend responde should_clear_auth, cerraremos la sesión de forma segura.</p>
                                <Button type="submit" disabled={updatingPassword} className="min-w-[180px]">
                                    {updatingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                                </Button>
                            </div>
                        </form>
                        </GenericModal>
                    </div>
                </CollapsibleCard>

                <CollapsibleCard
                    title="Acceso a Fincas"
                    accent="emerald"
                    defaultCollapsed={false}
                >
                    <div className="space-y-4">
                        <Alert className="bg-info/5 border-info/30">
                            <Info className="h-4 w-4 text-info" aria-hidden />
                            <AlertTitle className="font-semibold text-info">Unirse a otra finca</AlertTitle>
                            <AlertDescription className="text-info">
                                ¿Trabajas en más de una finca? Puedes solicitar unirte a otras instancias del sistema.
                                Un administrador de la finca destino deberá aprobar tu solicitud.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                Fincas donde ya eres miembro ({userMemberships.length})
                            </p>
                            {userMemberships.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Todavía no apareces como miembro de ninguna finca.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {userMemberships.map((membership) => (
                                        <li
                                            key={membership.key}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium break-words">{membership.name}</p>
                                                <p className="text-xs text-muted-foreground">{membership.role}</p>
                                            </div>
                                            {membership.isActive ? (
                                                <Badge variant="outline" className="bg-success/5 text-success border-success/30">
                                                    Finca activa
                                                </Badge>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={switching}
                                                    onClick={() => { void switchFinca(membership.fincaId); }}
                                                >
                                                    {switching ? 'Cambiando...' : 'Usar esta finca'}
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground">Envía una solicitud para trabajar en otra finca y conserva esta vista abierta.</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button type="button" onClick={() => setJoinFincaModalOpen(true)} className="w-full sm:w-auto">
                                Solicitar acceso a otra finca
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/select-finca')} className="w-full sm:w-auto">
                                Explorar fincas públicas
                            </Button>
                        </div>
                        <GenericModal
                            isOpen={joinFincaModalOpen}
                            onOpenChange={setJoinFincaModalOpen}
                            title="Unirse a otra finca"
                            description="Selecciona la finca y el rol que deseas solicitar."
                            size="lg"
                        >
                            <JoinFincaForm
                                onSuccess={() => setJoinFincaModalOpen(false)}
                                onCancel={() => setJoinFincaModalOpen(false)}
                            />
                        </GenericModal>
                    </div>
                </CollapsibleCard>
            </div>
        </div>
    );
};

export default UserProfile;
