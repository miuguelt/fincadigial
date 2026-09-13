import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  IconVaccine,
  IconTractor,
  IconMilk,
  IconPaw,
  IconPlus,
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';
import { TASK_TEMPLATES, TaskTemplate, TaskTemplateCategory } from '../tasks.types';

interface TaskTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TaskTemplate) => void;
}

export const TaskTemplatesModal: React.FC<TaskTemplatesModalProps> = ({
  open,
  onOpenChange,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TaskTemplateCategory | 'all'>('all');

  const categories: { id: TaskTemplateCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'Todas las faenas', icon: IconPlus },
    { id: 'sanidad', label: '💉 Sanidad y Curación', icon: IconVaccine },
    { id: 'potreros', label: '🌾 Potreros y Cercas', icon: IconTractor },
    { id: 'ordeno', label: '🥛 Ordeño y Nutrición', icon: IconMilk },
    { id: 'manejo', label: '🐂 Manejo y Pesaje', icon: IconPaw },
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? TASK_TEMPLATES
    : TASK_TEMPLATES.filter((t) => t.category === selectedCategory);

  const getPriorityVariant = (priority: TaskTemplate['priority']) => {
    switch (priority) {
      case 'Urgente':
        return 'destructive';
      case 'Alta':
        return 'warning';
      case 'Media':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span>📋 Plantillas Rápidas de Faenas del Campo</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Selecciona una labor típica ganadera para registrarla en 1 toque con datos sugeridos.
          </DialogDescription>
        </DialogHeader>

        {/* Selector de categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-b border-border/40 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Button
                key={cat.id}
                type="button"
                variant={isSelected ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-xl text-xs font-semibold whitespace-nowrap min-h-[38px] transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* Lista de plantillas */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template);
                  onOpenChange(false);
                }}
                className={cn(
                  'p-3 sm:p-3.5 rounded-xl border-2 border-border/70 bg-card hover:bg-accent/40',
                  'hover:border-primary/60 cursor-pointer transition-all duration-200 select-none',
                  'flex flex-col justify-between group active:scale-[0.99] shadow-sm'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {template.title}
                    </span>
                    <Badge variant={getPriorityVariant(template.priority) as any} className="text-[10px]">
                      {template.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {template.categoryLabel}
                  </span>
                  <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline">
                    Usar labor →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
