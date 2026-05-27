export type UIState = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'disabled';

export const ColorTokens: Record<UIState, {
  hex: string;
  bg: string;
  text: string;
  border: string;
  ring: string;
}> = {
  success: {
    hex: '#10b981',
    bg: 'bg-success',
    text: 'text-success-foreground',
    border: 'border-success',
    ring: 'ring-success'
  },
  error: {
    hex: '#ef4444',
    bg: 'bg-destructive',
    text: 'text-destructive-foreground',
    border: 'border-destructive',
    ring: 'ring-destructive'
  },
  warning: {
    hex: '#f59e0b',
    bg: 'bg-warning',
    text: 'text-warning-foreground',
    border: 'border-warning',
    ring: 'ring-warning'
  },
  info: {
    hex: '#3b82f6',
    bg: 'bg-info',
    text: 'text-info-foreground',
    border: 'border-info',
    ring: 'ring-info'
  },
  neutral: {
    hex: '#3b82f6',
    bg: 'bg-secondary',
    text: 'text-secondary-foreground',
    border: 'border-secondary',
    ring: 'ring-secondary'
  },
  disabled: {
    hex: '#6b7280',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-muted',
    ring: 'ring-muted'
  }
};

export const ToastDurations: Record<'success' | 'error' | 'warning' | 'info', number> = {
  success: 2500,
  error: 4500,
  warning: 4000,
  info: 3000,
};