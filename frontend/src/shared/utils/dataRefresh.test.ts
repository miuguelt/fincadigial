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
});
