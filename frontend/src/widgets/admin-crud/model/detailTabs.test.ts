import { describe, expect, it } from 'vitest';
import { buildDetailTabs, resolveDetailTab } from './detailTabs';

describe('detail tabs', () => {
  it('Given configured relation tabs, When building the modal tabs, Then it keeps Resumen first', () => {
    const tabs = buildDetailTabs([
      { id: 'relations', label: 'Relaciones', render: () => null },
    ]);

    expect(tabs.map((tab) => tab.id)).toEqual(['overview', 'relations']);
    expect(tabs[0].label).toBe('Resumen');
  });

  it('Given an unavailable active tab, When resolving it, Then it falls back to Resumen', () => {
    const tabs = buildDetailTabs([
      { id: 'relations', label: 'Relaciones', render: () => null },
    ]);

    expect(resolveDetailTab(tabs, 'missing')?.id).toBe('overview');
    expect(resolveDetailTab(tabs, 'relations')?.id).toBe('relations');
  });
});
