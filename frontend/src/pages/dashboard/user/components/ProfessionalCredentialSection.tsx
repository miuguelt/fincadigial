import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ExternalLink, Info, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

import { useToast } from '@/app/providers/ToastContext';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
    COMVEZCOL_REGISTRY_URL,
    CREDENTIAL_TITLES,
    CredentialBadge,
    useProfessionalCredential,
    type ProfessionalCredentialInput,
} from '@/entities/professional-credential';
import {
    professionalCredentialSchema,
    type ProfessionalCredentialFormValues,
} from '../utils/profile.schemas';

/**
 * Sección de acreditación profesional del veterinario.
 *
 * BORRADOR LEGAL — los textos de aviso de privacidad, autorización y límite de
 * responsabilidad de este archivo requieren revisión jurídica antes de salir a
 * producción. Están redactados sobre la Ley 1581 de 2012, el Decreto 1074 de
 * 2015 y la Ley 73 de 1985, pero no sustituyen concepto de abogado.
 */

const EMPTY_FORM: ProfessionalCredentialFormValues = {
    title: 'Médico Veterinario',
    professional_card_number: '',
    issuing_authority: 'COMVEZCOL',
    card_issued_at: '',
    university: '',
    graduation_year: '',
    specialization: '',
    ica_registration: '',
    practice_areas: '',
    liability_insurer: '',
    liability_policy_number: '',
    liability_expires_at: '',
    // Nunca premarcados: la autorización debe ser un acto expreso del titular.
    consent_accepted: false,
    sworn_declaration: false,
};

// `normal-case` y `tracking-normal` ganan por especificidad al selector global
// `label { text-transform: uppercase }` de app/styles/index.css.
const CONSENT_LABEL_CLASS =
    'flex-1 text-sm font-normal normal-case tracking-normal leading-relaxed text-foreground [overflow-wrap:break-word]';

const blankToNull = (value?: string | null) => {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
};

const PrivacyNotice = () => (
    <details className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Aviso de privacidad y tratamiento de datos
        </summary>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground [overflow-wrap:break-word]">
            <p>
                <strong className="text-foreground">Finalidad.</strong> Los datos de esta sección
                se usan únicamente para mostrar tu acreditación profesional dentro de Villa Luz y
                para que un Administrador o Propietario de tu finca pueda cotejarla contra el
                registro público de COMVEZCOL. No se comparten con terceros ni se usan con fines
                comerciales.
            </p>
            <p>
                <strong className="text-foreground">Qué no te pedimos.</strong> Nunca solicitamos
                copia de tu documento de identidad, fotografías de tu rostro, huellas ni datos de
                salud. Solo datos profesionales que ya son públicos en los registros de COMVEZCOL
                y del SNIES.
            </p>
            <p>
                <strong className="text-foreground">Quién los ve.</strong> Tu número de matrícula
                completo solo lo ven tú y quien realiza el cotejo. Para el resto de usuarios se
                muestra enmascarado, dejando visibles los últimos cuatro caracteres.
            </p>
            <p>
                <strong className="text-foreground">Tus derechos.</strong> Puedes conocer,
                actualizar y rectificar tus datos desde este mismo formulario, y suprimirlos o
                revocar tu autorización en cualquier momento con el botón «Eliminar mis datos
                profesionales». La supresión retira la insignia de tu perfil.
            </p>
            <p className="text-xs">
                Tratamiento conforme a la Ley 1581 de 2012 y al Decreto 1074 de 2015.
            </p>
        </div>
    </details>
);

const LiabilityDisclaimer = () => (
    <Alert>
        <Info className="h-4 w-4" aria-hidden />
        <AlertTitle>Villa Luz no acredita el ejercicio profesional</AlertTitle>
        <AlertDescription className="[overflow-wrap:break-word]">
            La habilitación para ejercer la medicina veterinaria en Colombia la otorga
            exclusivamente COMVEZCOL mediante la matrícula profesional (Ley 73 de 1985). La
            insignia de esta app solo indica que una persona autorizada de tu finca cotejó los
            datos contra el registro público en una fecha determinada, y caduca a los doce meses.
        </AlertDescription>
    </Alert>
);

interface FieldProps {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}

const Field = ({ id, label, hint, error, required, children }: FieldProps) => (
    <div className="space-y-1.5">
        <Label htmlFor={id}>
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {children}
        {hint && !error && (
            <p className="text-xs text-muted-foreground [overflow-wrap:break-word]">{hint}</p>
        )}
        {error && (
            <p role="alert" className="text-xs text-destructive [overflow-wrap:break-word]">
                {error}
            </p>
        )}
    </div>
);

export function ProfessionalCredentialSection({ className }: { className?: string }) {
    const { showToast } = useToast();
    const { credential, loading, saving, error, save, remove } = useProfessionalCredential();
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const form = useForm<ProfessionalCredentialFormValues>({
        resolver: zodResolver(professionalCredentialSchema),
        defaultValues: EMPTY_FORM,
    });
    const { register, handleSubmit, reset, setValue, watch, formState } = form;
    const { errors } = formState;

    useEffect(() => {
        if (!credential) return;
        reset({
            title: credential.title,
            professional_card_number: credential.professional_card_number ?? '',
            issuing_authority: credential.issuing_authority ?? 'COMVEZCOL',
            card_issued_at: credential.card_issued_at ?? '',
            university: credential.university ?? '',
            graduation_year: credential.graduation_year ? String(credential.graduation_year) : '',
            specialization: credential.specialization ?? '',
            ica_registration: credential.ica_registration ?? '',
            practice_areas: credential.practice_areas ?? '',
            liability_insurer: credential.liability_insurer ?? '',
            liability_policy_number: credential.liability_policy_number ?? '',
            liability_expires_at: credential.liability_expires_at ?? '',
            // Al editar, la autorización vuelve a pedirse: cada guardado registra
            // una nueva marca de consentimiento, así que debe volver a otorgarse.
            consent_accepted: false,
            sworn_declaration: false,
        });
    }, [credential, reset]);

    const onSubmit = async (values: ProfessionalCredentialFormValues) => {
        const payload: ProfessionalCredentialInput = {
            title: values.title,
            professional_card_number: values.professional_card_number.trim().toUpperCase(),
            issuing_authority: blankToNull(values.issuing_authority) ?? 'COMVEZCOL',
            card_issued_at: blankToNull(values.card_issued_at),
            university: values.university.trim(),
            graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
            specialization: blankToNull(values.specialization),
            ica_registration: blankToNull(values.ica_registration),
            practice_areas: blankToNull(values.practice_areas),
            liability_insurer: blankToNull(values.liability_insurer),
            liability_policy_number: blankToNull(values.liability_policy_number),
            liability_expires_at: blankToNull(values.liability_expires_at),
            consent_accepted: true,
        };

        try {
            await save(payload);
            showToast('Acreditación guardada. Queda pendiente de revisión.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudo guardar la acreditación.', 'error', 8000);
        }
    };

    const onDelete = async () => {
        try {
            await remove();
            reset(EMPTY_FORM);
            setConfirmingDelete(false);
            showToast('Datos profesionales eliminados.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudieron eliminar los datos.', 'error', 8000);
        }
    };

    const currentTitle = watch('title');
    const consentAccepted = watch('consent_accepted');
    const swornDeclaration = watch('sworn_declaration');

    return (
        <CollapsibleCard
            title="Acreditación profesional"
            accent="teal"
            defaultCollapsed={true}
            className={className}
        >
            <div className="space-y-5">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Cargando acreditación…
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            {credential ? (
                                <CredentialBadge
                                    status={credential.effective_status}
                                    verifiedAt={credential.verified_at}
                                    verifiedByName={credential.verified_by_name}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground [overflow-wrap:break-word]">
                                    Aún no has registrado tu acreditación. Al hacerlo, tu perfil
                                    mostrará una insignia que un Administrador o Propietario podrá
                                    cotejar contra el registro público.
                                </p>
                            )}
                        </div>

                        {credential?.effective_status === 'Rechazado' && credential.rejection_reason && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" aria-hidden />
                                <AlertTitle>Motivo del rechazo</AlertTitle>
                                <AlertDescription className="[overflow-wrap:break-word]">
                                    {credential.rejection_reason}
                                </AlertDescription>
                            </Alert>
                        )}

                        {credential?.effective_status === 'Por revalidar' && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" aria-hidden />
                                <AlertTitle>Verificación vencida</AlertTitle>
                                <AlertDescription className="[overflow-wrap:break-word]">
                                    Tu verificación cumplió doce meses. Guarda de nuevo tus datos
                                    para que un Administrador o Propietario los coteje otra vez.
                                </AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" aria-hidden />
                                <AlertDescription className="[overflow-wrap:break-word]">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <LiabilityDisclaimer />

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    id="credential-title"
                                    label="Título profesional"
                                    required
                                    error={errors.title?.message}
                                >
                                    <Select
                                        value={currentTitle}
                                        onValueChange={(value) =>
                                            setValue('title', value as ProfessionalCredentialFormValues['title'], {
                                                shouldValidate: true,
                                            })
                                        }
                                    >
                                        <SelectTrigger id="credential-title">
                                            <SelectValue placeholder="Selecciona tu título" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CREDENTIAL_TITLES.map((titleOption) => (
                                                <SelectItem key={titleOption} value={titleOption}>
                                                    {titleOption}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field
                                    id="credential-card"
                                    label="Número de matrícula profesional"
                                    required
                                    hint="Tal como aparece en tu tarjeta profesional de COMVEZCOL."
                                    error={errors.professional_card_number?.message}
                                >
                                    <Input
                                        id="credential-card"
                                        autoComplete="off"
                                        {...register('professional_card_number')}
                                    />
                                </Field>

                                <Field
                                    id="credential-authority"
                                    label="Entidad que expide"
                                    hint="Por defecto COMVEZCOL."
                                    error={errors.issuing_authority?.message}
                                >
                                    <Input id="credential-authority" {...register('issuing_authority')} />
                                </Field>

                                <Field
                                    id="credential-issued"
                                    label="Fecha de expedición"
                                    error={errors.card_issued_at?.message}
                                >
                                    <Input
                                        id="credential-issued"
                                        type="date"
                                        {...register('card_issued_at')}
                                    />
                                </Field>

                                <Field
                                    id="credential-university"
                                    label="Universidad"
                                    required
                                    hint="Verificable en el SNIES del Ministerio de Educación."
                                    error={errors.university?.message}
                                >
                                    <Input id="credential-university" {...register('university')} />
                                </Field>

                                <Field
                                    id="credential-year"
                                    label="Año de grado"
                                    error={errors.graduation_year?.message}
                                >
                                    <Input
                                        id="credential-year"
                                        type="number"
                                        inputMode="numeric"
                                        min={1950}
                                        max={new Date().getFullYear()}
                                        {...register('graduation_year')}
                                    />
                                </Field>

                                <Field
                                    id="credential-specialization"
                                    label="Especialización o posgrado"
                                    error={errors.specialization?.message}
                                >
                                    <Input
                                        id="credential-specialization"
                                        {...register('specialization')}
                                    />
                                </Field>

                                <Field
                                    id="credential-ica"
                                    label="Registro ICA"
                                    hint="Solo si estás autorizado para vacunación oficial o guías sanitarias."
                                    error={errors.ica_registration?.message}
                                >
                                    <Input id="credential-ica" {...register('ica_registration')} />
                                </Field>

                                <Field
                                    id="credential-areas"
                                    label="Áreas de práctica"
                                    hint="Por ejemplo: bovinos de leche, reproducción, cirugía."
                                    error={errors.practice_areas?.message}
                                >
                                    <Input id="credential-areas" {...register('practice_areas')} />
                                </Field>
                            </div>

                            <details className="rounded-lg border border-border/60 p-3">
                                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                    Póliza de responsabilidad civil profesional (opcional)
                                </summary>
                                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Field
                                        id="credential-insurer"
                                        label="Aseguradora"
                                        error={errors.liability_insurer?.message}
                                    >
                                        <Input
                                            id="credential-insurer"
                                            {...register('liability_insurer')}
                                        />
                                    </Field>
                                    <Field
                                        id="credential-policy"
                                        label="Número de póliza"
                                        error={errors.liability_policy_number?.message}
                                    >
                                        <Input
                                            id="credential-policy"
                                            {...register('liability_policy_number')}
                                        />
                                    </Field>
                                    <Field
                                        id="credential-policy-expiry"
                                        label="Vigencia hasta"
                                        error={errors.liability_expires_at?.message}
                                    >
                                        <Input
                                            id="credential-policy-expiry"
                                            type="date"
                                            {...register('liability_expires_at')}
                                        />
                                    </Field>
                                </div>
                            </details>

                            <PrivacyNotice />

                            <div className="space-y-3 rounded-lg border border-border/60 p-3">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="credential-consent"
                                        checked={consentAccepted}
                                        onCheckedChange={(checked) =>
                                            setValue('consent_accepted', checked === true, {
                                                shouldValidate: true,
                                            })
                                        }
                                        className="mt-0.5"
                                    />
                                    {/* `<label>` nativo: el Label del sistema hereda la regla
                                        global que pone las etiquetas en mayúsculas, y una frase
                                        de consentimiento gritada no se lee. */}
                                    <label
                                        htmlFor="credential-consent"
                                        className={CONSENT_LABEL_CLASS}
                                    >
                                        Autorizo de manera previa, expresa e informada el tratamiento
                                        de mis datos profesionales para las finalidades descritas en
                                        el aviso de privacidad.
                                    </label>
                                </div>
                                {errors.consent_accepted && (
                                    <p role="alert" className="text-xs text-destructive">
                                        {errors.consent_accepted.message}
                                    </p>
                                )}

                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="credential-sworn"
                                        checked={swornDeclaration}
                                        onCheckedChange={(checked) =>
                                            setValue('sworn_declaration', checked === true, {
                                                shouldValidate: true,
                                            })
                                        }
                                        className="mt-0.5"
                                    />
                                    <label
                                        htmlFor="credential-sworn"
                                        className={CONSENT_LABEL_CLASS}
                                    >
                                        Declaro bajo la gravedad de juramento que la información
                                        registrada es veraz y corresponde a mi matrícula profesional
                                        vigente.
                                    </label>
                                </div>
                                {errors.sworn_declaration && (
                                    <p role="alert" className="text-xs text-destructive">
                                        {errors.sworn_declaration.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Button type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                            Guardando…
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                                            Guardar acreditación
                                        </>
                                    )}
                                </Button>

                                <a
                                    href={COMVEZCOL_REGISTRY_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-info hover:underline"
                                >
                                    Consultar el registro de COMVEZCOL
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                            </div>
                        </form>

                        {credential && (
                            <div className="border-t border-border/60 pt-4">
                                {confirmingDelete ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-foreground [overflow-wrap:break-word]">
                                            Se eliminarán todos tus datos profesionales y la insignia
                                            desaparecerá de tu perfil. Esta acción no se puede deshacer.
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={onDelete}
                                                disabled={saving}
                                            >
                                                Sí, eliminar mis datos
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setConfirmingDelete(false)}
                                                disabled={saving}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setConfirmingDelete(true)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                                        Eliminar mis datos profesionales
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </CollapsibleCard>
    );
}

export default ProfessionalCredentialSection;
