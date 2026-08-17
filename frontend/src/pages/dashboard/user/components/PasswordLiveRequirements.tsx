import { IconCircleCheck, IconAlertTriangle } from '@/shared/ui/icons';

interface ItemProps {
    ok: boolean;
    text: string;
}

const Item = ({ ok, text }: ItemProps) => (
    <div className={`flex items-start gap-2 text-sm ${ok ? 'text-success' : 'text-muted-foreground'}`}>
        {ok ? <IconCircleCheck size="sm" className="mt-0.5" aria-hidden /> : <IconAlertTriangle size="sm" className="mt-0.5" aria-hidden />}
        <span>{text}</span>
    </div>
);

interface PasswordLiveRequirementsProps {
    newPassword: string;
    confirmPassword: string;
}

export const PasswordLiveRequirements = ({ newPassword, confirmPassword }: PasswordLiveRequirementsProps) => {
    const lengthOk = newPassword.length >= 8;
    const uppercaseOk = /[A-Z]/.test(newPassword);
    const lowercaseOk = /[a-z]/.test(newPassword);
    const matchOk = !!newPassword && !!confirmPassword && newPassword === confirmPassword;

    return (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Item ok={lengthOk} text="Mínimo 8 caracteres" />
            <Item ok={uppercaseOk} text="Incluye 1 mayúscula" />
            <Item ok={lowercaseOk} text="Incluye 1 minúscula" />
            <Item ok={matchOk} text="Confirmación coincide" />
        </div>
    );
};
