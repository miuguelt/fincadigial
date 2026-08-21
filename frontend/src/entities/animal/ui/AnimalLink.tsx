import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';
import { Button } from '@/shared/ui/button';

export const AnimalLink: React.FC<{
  id: number | string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ id, label, className = '', children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <span
        onClick={handleClick}
        className={`inline-flex items-center cursor-pointer font-medium text-primary hover:underline transition-colors ${className}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {children || label || `Animal #${id}`}
      </span>

      {isOpen && (
        <AnimalDetailModal
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          animalId={id}
        />
      )}
    </>
  );
};

export const AnimalGrowthLink: React.FC<{
  id: number | string;
  label: string;
  className?: string;
}> = ({ id, label, className = '' }) => {
  return (
    <AnimalLink id={id} label={label}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 w-9 p-0 flex-shrink-0 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 ${className}`}
        title={`Ver Análisis de Crecimiento de ${label}`}
      >
        <TrendingUp className="h-4 w-4" />
      </Button>
    </AnimalLink>
  );
};
