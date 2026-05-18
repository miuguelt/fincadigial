import type { BubbleVariant } from '../UserProfile.schemas';

const variantStyles: Record<BubbleVariant, { wrapper: string; arrow: string }> = {
    success: { wrapper: 'border-green-200 bg-green-50 text-green-800', arrow: 'border-green-200 bg-green-50' },
    error: { wrapper: 'border-red-200 bg-red-50 text-red-700', arrow: 'border-red-200 bg-red-50' },
    info: { wrapper: 'border-blue-200 bg-blue-50 text-blue-800', arrow: 'border-blue-200 bg-blue-50' },
    warning: { wrapper: 'border-yellow-200 bg-yellow-50 text-yellow-800', arrow: 'border-yellow-200 bg-yellow-50' },
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

