import React from 'react';
import { cn } from './cn';

export type SuggestionOption = string | number | { label: string; value: any };

export interface SuggestionChipsProps {
  suggestions?: SuggestionOption[];
  value?: any;
  onSelect: (value: any) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  value,
  onSelect,
  label = 'Sugerencias:',
  disabled = false,
  className,
}) => {
  if (!suggestions || suggestions.length === 0 || disabled) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 pt-1 select-none', className)}>
      {label && (
        <span className="text-[11px] uppercase font-bold text-muted-foreground/70 tracking-wider">
          {label}
        </span>
      )}
      {suggestions.map((suggestion, index) => {
        const itemLabel = typeof suggestion === 'object' && suggestion !== null ? suggestion.label : String(suggestion);
        const itemValue = typeof suggestion === 'object' && suggestion !== null ? suggestion.value : suggestion;
        const isSelected = value !== undefined && value !== null && String(value).trim() === String(itemValue).trim();

        return (
          <button
            key={`${itemLabel}-${index}`}
            type="button"
            onClick={() => onSelect(itemValue)}
            className={cn(
              'min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted/40 hover:bg-muted text-foreground/80 border-border/50 hover:border-primary/40 active:scale-95'
            )}
          >
            {itemLabel}
          </button>
        );
      })}
    </div>
  );
};

export default SuggestionChips;
