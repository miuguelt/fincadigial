import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FincasAdminPage, { fincaFormDefaults, fincasConfig } from './FincasAdminPage';
import { fincaFormDefaults as extractedFincaFormDefaults } from './fincaFormDefaults';
import { fincasConfig as extractedFincasConfig } from './fincasConfig';
import { fincasAdminService } from './fincasService';

vi.mock('@/widgets/admin-crud', () => ({
  AdminCRUDPage: ({ config }: any) => <div>{config.customToolbar}</div>,
}));
vi.mock('@/shared/hooks/useGlobalViewMode', () => ({
  useGlobalViewMode: () => ['cards', vi.fn()],
}));
vi.mock('@/shared/api/apiFetch', () => ({
  apiFetch: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock('@/shared/api/client', () => ({
  unwrapApi: () => [],
}));
vi.mock('../../../../features/multi-finca/ui/InviteUserDialog', () => ({
  InviteUserDialog: () => null,
}));
vi.mock('@/widgets/finca/FincaImagesManager', () => ({
  FincaImagesManager: () => null,
}));
vi.mock('./components/FincasBentoHeader', () => ({
  FincasBentoHeader: () => null,
}));
vi.mock('./components/FincaPrivacyModal', () => ({
  FincaPrivacyModal: () => null,
}));
vi.mock('./components/FincaCustomDetail', () => ({
  FincaCustomDetail: () => null,
}));
vi.mock('./components/AdminFincaCard', () => ({
  AdminFincaCard: () => null,
}));

describe('FincasAdminPage contract', () => {
  it('mantiene la configuración y el servicio en seams dedicados', () => {
    expect(fincasConfig).toBe(extractedFincasConfig);
    expect(fincaFormDefaults).toBe(extractedFincaFormDefaults);
    expect(fincasAdminService).toBeDefined();
  });

  it('uses the real Finca API fields and includes every required field', () => {
    const columnKeys = fincasConfig.columns.map((column) => column.key);
    const fieldNames = fincasConfig.formSections
      ?.flatMap((section) => section.fields)
      .map((field) => field.name);

    expect(columnKeys).toEqual(expect.arrayContaining([
      'id',
      'name',
      'type',
      'department',
      'municipality',
      'public_visibility',
      'is_active',
    ]));
    expect(columnKeys).not.toEqual(expect.arrayContaining(['location', 'size_ha', 'status']));
    expect(fieldNames).toEqual(expect.arrayContaining(['name', 'type', 'public_visibility']));
    expect(fincaFormDefaults).toMatchObject({
      name: '',
      type: 'Tradicional',
      public_visibility: 'minimal',
      is_active: true,
    });
  });

  it('includes proper options for privacy and visibility policy', () => {
    const visibilityField = fincasConfig.formSections
      ?.flatMap((section) => section.fields)
      .find((field) => field.name === 'public_visibility');

    expect(visibilityField).toBeDefined();
    expect(visibilityField?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'minimal' }),
        expect.objectContaining({ value: 'standard' }),
        expect.objectContaining({ value: 'full' }),
      ])
    );
  });

  it('uses the finca name as the profile modal title', () => {
    expect(typeof fincasConfig.detailTitle).toBe('function');
    expect((fincasConfig.detailTitle as (item: { name: string }) => string)({ name: 'Finca El Roble' }))
      .toBe('Ficha de Finca El Roble');
  });

  it('mantiene visibles en móvil las etiquetas de vista y usa botones táctiles de 44 px', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FincasAdminPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const tarjetasLabel = screen.getByText('Tarjetas');
    const tablaLabel = screen.getByText('Tabla');
    expect(tarjetasLabel.className).not.toContain('hidden');
    expect(tablaLabel.className).not.toContain('hidden');
    expect(screen.getByRole('button', { name: /tarjetas/i }).className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: /tabla/i }).className).toContain('min-h-[44px]');
  });
});
