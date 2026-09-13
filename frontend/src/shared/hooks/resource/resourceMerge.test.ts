import { mergeRecentItems } from './resourceMerge';

describe('mergeRecentItems', () => {
  it('preserves a local update when the next server read is stale', () => {
    const result = mergeRecentItems({
      serverList: [{ id: 42, description: 'valor anterior' }],
      currentData: [{ id: 42, description: 'valor actualizado' }],
      recentlyCreatedIds: new Set<string>(),
      recentlyCreatedItems: new Map(),
      recentlyUpdatedIds: new Set(['42']),
      recentlyUpdatedItems: new Map([
        ['42', { id: 42, description: 'valor actualizado' }],
      ]),
    } as any);

    expect(result.merged).toEqual([
      { id: 42, description: 'valor actualizado' },
    ]);
  });
});
