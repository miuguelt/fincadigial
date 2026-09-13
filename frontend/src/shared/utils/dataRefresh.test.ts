import { emitDataRefresh } from './dataRefresh';

describe('emitDataRefresh', () => {
  it('notifica a las vistas genericas y a las consultas derivadas', () => {
    const crudListener = vi.fn();
    const resourceListener = vi.fn();
    window.addEventListener('crud:refetch', crudListener);
    window.addEventListener('server-resource-changed', resourceListener);

    emitDataRefresh('milk-production');

    expect(crudListener).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({
        resource: 'milk-production',
        force: true,
      }),
    }));
    expect(resourceListener).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({
        endpoint: 'milk-production',
        force: true,
        local: true,
      }),
    }));

    window.removeEventListener('crud:refetch', crudListener);
    window.removeEventListener('server-resource-changed', resourceListener);
  });

  it('does not drop a different resource notification in the debounce window', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const resources: unknown[] = [];
    const listener = (event: Event) => {
      resources.push((event as CustomEvent).detail?.resource);
    };
    window.addEventListener('crud:refetch', listener);

    emitDataRefresh('control');
    emitDataRefresh('milk-production');

    expect(resources).toEqual(['control', 'milk-production']);
    window.removeEventListener('crud:refetch', listener);
  });
});
