import { z } from 'zod';
import type { ActivityEntity, ActivityAction, ActivitySeverity } from '@/features/activity/model/useDerivedActivity';

export const profileSchema = z.object({
    fullname: z.string().min(3, 'Ingresa al menos 3 caracteres').max(120, 'Nombre demasiado largo'),
    email: z.string().email('Correo electrónico inválido'),
    phone: z.string().optional().refine((value) => !value || /^[0-9+()\\-\\s]{7,20}$/.test(value), 'Teléfono inválido'),
    address: z.string().max(160, 'Dirección demasiado larga').optional(),
});

export const passwordSchema = z
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

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordFormValues = z.infer<typeof passwordSchema>;

export type BubbleVariant = 'success' | 'error' | 'info' | 'warning';

export type PasswordStatus = {
    type: BubbleVariant;
    title: string;
    message: string;
};

export type ActivityEntityFilter = ActivityEntity | 'all';
export type ActivityActionFilter = ActivityAction | 'all';
export type ActivitySeverityFilter = ActivitySeverity | 'all';

export const PASSWORD_POLICY_HELP = 'La nueva contraseña debe tener mínimo 8 caracteres e incluir al menos 1 mayúscula y 1 minúscula. Ejemplo: Abcdefgh';
