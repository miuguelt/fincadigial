import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import GanaderiaOperativaPage from './GanaderiaOperativaPage';

const {
  mockUseAuth,
  showToast,
  apiPost,
  createTreatment,
  createAnimalDisease,
  createAnimalField,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  showToast: vi.fn(),
  apiPost: vi.fn(),
  createTreatment: vi.fn(),
  createAnimalDisease: vi.fn(),
  createAnimalField: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: mockUseAuth,
}));
vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true, totalOperations: 0 }),
}));
vi.mock('@/shared/api/offline/offlineQueue', () => ({
  offlineQueue: { enqueue: vi.fn() },
}));
vi.mock('@/shared/api/client', () => ({
  __esModule: true,
  default: { post: apiPost, get: vi.fn() },
  apiClient: { get: vi.fn() },
}));
vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getAnimals: vi.fn().mockResolvedValue([
      { id: 4, record: 'V-004', sex: 'Hembra', breed: { name: 'Holstein' } },
    ]),
  },
}));
vi.mock('@/entities/field/api/field.service', () => ({
  fieldService: {
    getFields: vi.fn().mockResolvedValue([{ id: 2, name: 'Potrero Norte' }]),
  },
}));
vi.mock('@/entities/disease/api/disease.service', () => ({
  diseaseService: {
    getDiseases: vi.fn().mockResolvedValue([{ id: 3, name: 'Mastitis' }]),
  },
}));
vi.mock('@/entities/medication/api/medications.service', () => ({
  medicationsService: {
    getMedications: vi.fn().mockResolvedValue([{ id: 5, name: 'Oxitetraciclina' }]),
  },
}));
vi.mock('@/entities/milk/api/milk.service', () => ({
  milkService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/entities/animal-field/api/animalFields.service', () => ({
  animalFieldsService: {
    getAll: vi.fn().mockResolvedValue([]),
    createAnimalField,
  },
}));
vi.mock('@/entities/animal-disease/api/animalDiseases.service', () => ({
  animalDiseasesService: {
    getAll: vi.fn().mockResolvedValue([]),
    createAnimalDisease,
  },
}));
vi.mock('@/entities/treatment/api/treatments.service', () => ({
  treatmentsService: {
    getAll: vi.fn().mockResolvedValue([]),
    createTreatment,
  },
}));
vi.mock('@/widgets/layout/CampesinoViewShell', () => ({
  CampesinoViewShell: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));
vi.mock('@/shared/ui/select', () => {
  const collectItems = (node: any, acc: Array<{ value: string; label: string }> = []) => {
    if (!node) return acc;
    if (Array.isArray(node)) {
      node.forEach((child) => collectItems(child, acc));
      return acc;
    }
    if (React.isValidElement(node)) {
      const props: any = node.props || {};
      if ((node.type as any)?.isMockSelectItem && props.value !== undefined) {
        const text = Array.isArray(props.children) ? props.children.join('') : String(props.children ?? '');
        acc.push({ value: String(props.value), label: text });
      }
      if (props.children) collectItems(props.children, acc);
    }
    return acc;
  };
  const findTriggerId = (node: any): string | undefined => {
    if (!node) return undefined;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findTriggerId(child);
        if (found) return found;
      }
      return undefined;
    }
    if (React.isValidElement(node)) {
      const props: any = node.props || {};
      if ((node.type as any)?.isMockSelectTrigger && props.id) return props.id;
      if (props.children) return findTriggerId(props.children);
    }
    return undefined;
  };
  const SelectItem = ({ children }: any) => <>{children}</>;
  (SelectItem as any).isMockSelectItem = true;
  const SelectTrigger = ({ children }: any) => <>{children}</>;
  (SelectTrigger as any).isMockSelectTrigger = true;
  return {
    Select: ({ value, onValueChange, children }: any) => {
      const id = findTriggerId(children);
      const options = collectItems(children);
      return (
        <select
          id={id}
          data-testid={id || 'mock-select'}
          value={value ?? ''}
          onChange={(e) => onValueChange?.(e.target.value)}
        >
          <option value="">— Seleccionar —</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    },
    SelectTrigger,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem,
  };
});

describe('GanaderiaOperativaPage', () => {
  beforeEach(() => {
    showToast.mockClear();
    apiPost.mockReset();
    createTreatment.mockReset();
    createAnimalDisease.mockReset();
    createAnimalField.mockReset();
    mockUseAuth.mockReturnValue({
      user: { id: 9, fullname: 'Juan Operario', role: 'Operario' },
      role: 'Operario',
    });
  });

  it('filtra acciones rápidas por RBAC para Operario y mantiene las permitidas', async () => {
    render(
      <MemoryRouter>
        <GanaderiaOperativaPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/no hay registros que coincidan/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /registrar ordeño.*anota litros/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mover ganado/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /avisar un animal enfermo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar tratamiento/i })).not.toBeInTheDocument();
  });

  it('bloquea ordeño con 0 litros sin llamar al servidor', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/campesino/ganaderia?modal=milk']}>
        <GanaderiaOperativaPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/¿de qué vaca/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('option', { name: /v-004/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(/¿de qué vaca/i), '4');
    const litersInput = screen.getByLabelText(/¿cuántos litros dio\?/i);
    fireEvent.change(litersInput, { target: { value: '0' } });
    fireEvent.submit(litersInput.closest('form')!);

    expect(apiPost).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/litros/i), 'error');
  });

  it('muestra el mensaje real del servidor al fallar ordeño o tratamiento', async () => {
    const user = userEvent.setup();
    apiPost.mockRejectedValue({
      response: { status: 422, data: { message: 'Vaca en período de retiro sanitario' } },
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/campesino/ganaderia?modal=milk']}>
        <GanaderiaOperativaPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /v-004/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(/¿de qué vaca/i), '4');
    await user.type(screen.getByLabelText(/¿cuántos litros dio\?/i), '8');
    await user.click(screen.getByRole('button', { name: /guardar producción/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Vaca en período de retiro sanitario', 'error'),
    );
    unmount();

    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'Administrador' },
      role: 'Administrador',
    });
    createTreatment.mockRejectedValue({
      response: { status: 400, data: { message: 'Stock insuficiente en el lote sanitario' } },
    });

    render(
      <MemoryRouter initialEntries={['/campesino/ganaderia?modal=treatment']}>
        <GanaderiaOperativaPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /oxitetraciclina/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(/animal de tratamiento/i), '4');
    await user.selectOptions(screen.getByLabelText(/medicamento \/ vacuna/i), '5');
    await user.type(screen.getByLabelText(/dosis administrada/i), '5 ml');
    await user.click(screen.getByRole('button', { name: /aplicar medicina/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Stock insuficiente en el lote sanitario', 'error'),
    );
  });

  it('limita a hoy en Colombia los selectores de fecha de los modales', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'Administrador' },
      role: 'Administrador',
    });
    const today = getTodayColombia();

    for (const [modal, selector] of [
      ['milk', '#milk-date'],
      ['transfer', '#tf-date'],
      ['disease', '#dis-date'],
      ['treatment', '#tx-date'],
    ] as const) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[`/campesino/ganaderia?modal=${modal}`]}>
          <GanaderiaOperativaPage />
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.querySelector(selector)).toBeInTheDocument());
      expect(document.querySelector(selector)).toHaveAttribute('max', today);
      unmount();
    }
  });

  it('omite instructor_id cuando user.id no está definido al reportar enfermedad', async () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'Administrador' },
      role: 'Administrador',
    });
    createAnimalDisease.mockResolvedValue({ id: 22 });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/campesino/ganaderia?modal=disease']}>
        <GanaderiaOperativaPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /mastitis/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(/animal afectado/i), '4');
    await user.selectOptions(screen.getByLabelText(/diagnóstico \/ patología/i), '3');
    await user.click(screen.getByRole('button', { name: /reportar caso clínico/i }));

    await waitFor(() => expect(createAnimalDisease).toHaveBeenCalledTimes(1));
    const payload = createAnimalDisease.mock.calls[0][0];
    expect(payload).not.toHaveProperty('instructor_id');
  });
});
