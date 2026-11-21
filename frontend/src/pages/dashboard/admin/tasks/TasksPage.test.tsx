import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/entities/task/api/task.service';
import TasksPage from './index';

const { mockUseAuth, showToast, updateStatus, sampleTask } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  showToast: vi.fn(),
  updateStatus: vi.fn(),
  sampleTask: {
    id: 11,
    title: 'Revisar cerca eléctrica del potrero norte',
    description: 'Verificar voltaje y estacas',
    status: 'Pendiente' as const,
    priority: 'Alta' as const,
    due_date: '2026-11-21',
    finca_id: 1,
  },
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: mockUseAuth,
}));
vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/entities/task/api/task.service', () => ({
  taskService: {
    getAll: vi.fn().mockResolvedValue([sampleTask]),
    updateStatus,
  },
}));
vi.mock('@/entities/animal/api/animal.service', () => ({
  animalService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/entities/field/api/field.service', () => ({
  fieldService: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/entities/user/api/assignableUsers.service', () => ({
  fetchAssignableUsers: vi.fn().mockResolvedValue([]),
}));
vi.mock('./components/TaskMetricsBento', () => ({
  TaskMetricsBento: () => <div data-testid="task-metrics" />,
}));
vi.mock('./components/TaskQuickFilters', () => ({
  TaskQuickFilters: () => <div data-testid="task-filters" />,
}));
vi.mock('./components/TaskTemplatesModal', () => ({
  TaskTemplatesModal: () => null,
}));
vi.mock('./components/TaskDetailContent', () => ({
  TaskDetailContent: () => null,
}));
vi.mock('./components/TaskCompletionBadge', () => ({
  TaskCompletionBadge: () => null,
}));
vi.mock('@/widgets/admin-crud', () => ({
  AdminCRUDPage: ({ config, additionalFormContent }: any) => (
    <div>
      {config.customToolbar}
      <div data-testid="task-card-slot">{config.renderCard?.(sampleTask, vi.fn())}</div>
      <div data-testid="task-actions-slot">{config.customActions?.(sampleTask)}</div>
      <div data-testid="task-form-addon">{additionalFormContent?.({}, undefined)}</div>
    </div>
  ),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    showToast.mockClear();
    updateStatus.mockReset();
  });

  it('oculta plantillas y botones de cambio de estado para Aprendiz', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 3, role: 'Aprendiz' }, role: 'Aprendiz' });

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/revisar cerca eléctrica/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /plantillas de faena/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /usar plantilla/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^iniciar faena$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^¡completar!$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cumplir$/i })).not.toBeInTheDocument();
  });

  it('permite cambiar estado al Operario pero oculta creación de plantillas', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 4, role: 'Operario' }, role: 'Operario' });

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /^iniciar faena$/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^¡completar!$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cumplir$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /plantillas de faena/i })).not.toBeInTheDocument();
  });

  it('muestra plantillas y etiquetas móviles visibles con botones de 44 px para Administrador', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'Administrador' }, role: 'Administrador' });

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    const templatesBtn = await screen.findByRole('button', { name: /plantillas de faena/i });
    expect(templatesBtn.className).toContain('min-h-[44px]');

    const cuadernoLabel = screen.getByText('Cuaderno');
    const tablaLabel = screen.getByText('Tabla');
    expect(cuadernoLabel.className).not.toContain('hidden');
    expect(tablaLabel.className).not.toContain('hidden');
  });

  it('muestra el mensaje real del servidor cuando falla al cambiar el estado de la labor', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 4, role: 'Operario' }, role: 'Operario' });
    updateStatus.mockRejectedValue({
      response: { status: 422, data: { message: 'Debes registrar una observación antes de completar' } },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /^¡completar!$/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'Debes registrar una observación antes de completar',
        'error',
      ),
    );
  });
});
