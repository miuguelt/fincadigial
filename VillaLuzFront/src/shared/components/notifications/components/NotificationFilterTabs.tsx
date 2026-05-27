import { cn } from '@/shared/lib/utils';

type FilterTab = 'todas' | 'criticas' | 'pendientes' | 'leidas';

interface NotificationFilterTabsProps {
  tabs: { key: FilterTab; label: string; count?: number }[];
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

export function NotificationFilterTabs({ tabs, activeTab, onTabChange }: NotificationFilterTabsProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
            activeTab === tab.key
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={cn(
              'ml-1 px-1.5 py-0.5 rounded-full text-[10px]',
              activeTab === tab.key ? 'bg-primary/20' : 'bg-muted'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default NotificationFilterTabs;
