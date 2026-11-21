import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import AdminAnimalFieldsPage from './index';

const { getAnimals, getFields } = vi.hoisted(() => ({
  getAnimals: vi.fn(),
  getFields: vi.fn(),
}));

let capturedConfig: any = null;

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: { getAnimals },
}));
vi.mock('@/entities/field/api/field.service', () => ({
  fieldService: { getFields },
}));
vi.mock('@/entities/animal-field/api/animalFields.service', () => ({
  animalFieldsService: {},
}));
vi.mock('@/widgets/admin-crud', () => ({
  AdminCRUDPage: ({ config }: { config: any }) => {
    capturedConfig = config;
    return <div data-testid="animal-fields-crud" />;
  },
}));

describe('AdminAnimalFieldsPage', () => {
  beforeEach(() => {
    capturedConfig = null;
    getAnimals.mockReset().mockResolvedValue([{ id: 1, record: 'BOV-01', status: 'Vivo' }]);
    getFields.mockReset().mockResolvedValue([{ id: 2, name: 'Potrero Norte' }]);
  });

  it('filtra animales vivos, formatea fechas en zona Colombia y limita fechas a hoy', async () => {
    render(
      <MemoryRouter>
        <AdminAnimalFieldsPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(getAnimals).toHaveBeenCalledWith(expect.objectContaining({ status: 'Vivo' })),
    );

    expect(capturedConfig).toBeTruthy();
    const assignmentCol = capturedConfig.columns.find((c: any) => c.key === 'assignment_date');
    const removalCol = capturedConfig.columns.find((c: any) => c.key === 'removal_date');
    expect(assignmentCol.render('2026-11-21')).toBe('2026-11-21');
    expect(removalCol.render('2026-11-21')).toBe('2026-11-21');

    const fields = capturedConfig.formSections.flatMap((s: any) => s.fields);
    const assignmentField = fields.find((f: any) => f.name === 'assignment_date');
    const removalField = fields.find((f: any) => f.name === 'removal_date');
    expect(assignmentField.maxDate).toBe(getTodayColombia());
    expect(removalField.maxDate).toBe(getTodayColombia());
  });
});
