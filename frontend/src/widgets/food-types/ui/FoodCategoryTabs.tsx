import React from 'react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import {
  FORAGE_CATEGORIES,
  type ForageCategoryId,
} from '@/entities/food-type/model/forageClassification';

interface FoodCategoryTabsProps {
  activeCategory: ForageCategoryId;
  onSelectCategory: (category: ForageCategoryId) => void;
  counts: Record<ForageCategoryId, number>;
}

export const FoodCategoryTabs: React.FC<FoodCategoryTabsProps> = ({
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  const categoriesList: Array<{ id: ForageCategoryId; label: string; icon: string }> = [
    { id: 'all', label: 'Todos', icon: '🌾' },
    { id: 'pasture', label: FORAGE_CATEGORIES.pasture.shortLabel, icon: FORAGE_CATEGORIES.pasture.icon },
    { id: 'cut_grass', label: FORAGE_CATEGORIES.cut_grass.shortLabel, icon: FORAGE_CATEGORIES.cut_grass.icon },
    { id: 'legume_silvopastoral', label: FORAGE_CATEGORIES.legume_silvopastoral.shortLabel, icon: FORAGE_CATEGORIES.legume_silvopastoral.icon },
    { id: 'silage_hay', label: FORAGE_CATEGORIES.silage_hay.shortLabel, icon: FORAGE_CATEGORIES.silage_hay.icon },
    { id: 'mineral_supplement', label: FORAGE_CATEGORIES.mineral_supplement.shortLabel, icon: FORAGE_CATEGORIES.mineral_supplement.icon },
    { id: 'concentrate', label: FORAGE_CATEGORIES.concentrate.shortLabel, icon: FORAGE_CATEGORIES.concentrate.icon },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none no-scrollbar">
      {categoriesList.map((cat) => {
        const count = counts[cat.id] || 0;
        const isActive = activeCategory === cat.id;

        return (
          <Button
            key={cat.id}
            variant="ghost"
            size="sm"
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              'h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 gap-1.5 shrink-0 border',
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-bold'
                : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/50 hover:border-border'
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span
              className={cn(
                'text-[11px] px-1.5 py-0.2 rounded-full font-bold ml-0.5',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {count}
            </span>
          </Button>
        );
      })}
    </div>
  );
};
export default FoodCategoryTabs;