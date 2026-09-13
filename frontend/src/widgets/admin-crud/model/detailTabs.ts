import type { ReactNode } from 'react';

export interface DetailTabDefinition<T> {
  id: string;
  label: string;
  icon?: ReactNode;
  render: (item: T, handlers?: any) => ReactNode;
}

const overviewTab = <T,>(): DetailTabDefinition<T> => ({
  id: 'overview',
  label: 'Resumen',
  render: () => null,
});

export function buildDetailTabs<T>(tabs: ReadonlyArray<DetailTabDefinition<T>> = []) {
  const configuredTabs = tabs.filter((tab, index, allTabs) => (
    Boolean(tab.id && tab.label && tab.render)
      && tab.id !== 'overview'
      && allTabs.findIndex((candidate) => candidate.id === tab.id) === index
  ));

  return [overviewTab<T>(), ...configuredTabs];
}

export function resolveDetailTab<T>(tabs: ReadonlyArray<DetailTabDefinition<T>>, activeId: string) {
  return tabs.find((tab) => tab.id === activeId) ?? tabs[0];
}
