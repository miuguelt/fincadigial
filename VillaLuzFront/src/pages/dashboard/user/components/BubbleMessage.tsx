import type { BubbleVariant } from '../UserProfile.schemas';

const variantStyles: Record<BubbleVariant, { wrapper: string; arrow: string }> = {
    success: { wrapper: 'border-success/30 bg-success/5 text-success', arrow: 'border-success/30 bg-success/5' },
    error: { wrapper: 'border-destructive/30 bg-destructive/5 text-destructive', arrow: 'border-destructive/30 bg-destructive/5' },
    info: { wrapper: 'border-info/30 bg-info/5 text-info', arrow: 'border-info/30 bg-info/5' },
    warning: { wrapper: 'border-yellow-200 bg-warning/5 text-warning', arrow: 'border-yellow-200 bg-warning/5' },
};

interface BubbleMessageProps {
    message: string;
    variant?: BubbleVariant;
}

export const BubbleMessage = ({ message, variant = 'error' }: BubbleMessageProps) => {
    const styles = variantStyles[variant];
    return (
        <div role="alert" className={`relative mt-2 rounded-lg border px-3 py-2 text-sm shadow-sm ${styles.wrapper}`}>
            <span aria-hidden="true" className={`absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t ${styles.arrow}`} />
            {message}
        </div>
    );
};

