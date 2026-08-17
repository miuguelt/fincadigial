import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalUsersPage from './GlobalUsersPage';

const mocks = vi.hoisted(() => ({
  getGlobalUsers: vi.fn(),
  getUserActivity: vi.fn(),
  toast: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/entities/user/api/user.service', () => ({
  usersService: {
    getGlobalUsers: mocks.getGlobalUsers,
    getUserActivity: mocks.getUserActivity,
  },
}));

vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/providers/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ toast: mocks.toast, showToast: mocks.toast }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, fullname: 'Admin Master', role: 'Administrador' },
  }),
}));

describe('GlobalUsersPage', () => {
  const sampleUsers = [
    {
      id: 1,
      identification: 12345678,
      fullname: "Administrador Sistema",
      email: "admin@villaluz.com",
      phone: "3001234567",
      address: null,
      role: "Administrador",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-05-09T23:32:18Z",
      updated_at: "2026-07-18T16:12:40.057097Z",
      fincas: [
        {
          id: 1,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Administrador",
          is_active: true,
          is_primary: true,
          created_at: "2026-05-09T23:32:18"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: true,
      version_id: 6
    },
    {
      id: 85,
      identification: 1098,
      fullname: "Admin VillaLuz",
      email: "test_admin@villaluz.com",
      phone: "3000000000",
      address: null,
      role: "Administrador",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:57.936119Z",
      updated_at: "2026-08-15T15:55:57.933140Z",
      fincas: [
        {
          id: 1037,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Administrador",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:57.958124"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: true,
      version_id: 1
    },
    {
      id: 86,
      identification: 55555555,
      fullname: "Don Carlos Dueño",
      email: "propietario@villaluz.co",
      phone: "3005555555",
      address: null,
      role: "Propietario",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:58.099938Z",
      updated_at: "2026-08-15T15:55:58.098932Z",
      fincas: [
        {
          id: 1038,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Propietario",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:58.102102"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: false,
      version_id: 1
    },
    {
      id: 87,
      identification: 66666666,
      fullname: "Capataz Pedro",
      email: "capataz@villaluz.co",
      phone: "3006666666",
      address: null,
      role: "Capataz",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:58.227999Z",
      updated_at: "2026-08-15T15:55:58.227336Z",
      fincas: [
        {
          id: 1039,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Capataz",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:58.230500"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: false,
      version_id: 1
    },
    {
      id: 88,
      identification: 11111111,
      fullname: "Instructor Jefe",
      email: "instructor@sena.edu.co",
      phone: "3001111111",
      address: null,
      role: "Instructor",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:58.358636Z",
      updated_at: "2026-08-15T15:55:58.357450Z",
      fincas: [
        {
          id: 1040,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Instructor",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:58.361759"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: false,
      version_id: 1
    },
    {
      id: 89,
      identification: 22222222,
      fullname: "Aprendiz SENA 1",
      email: "aprendiz@sena.edu.co",
      phone: "3002222222",
      address: null,
      role: "Aprendiz",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:58.479892Z",
      updated_at: "2026-08-15T15:55:58.478962Z",
      fincas: [
        {
          id: 1041,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Aprendiz",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:58.482659"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: false,
      version_id: 1
    },
    {
      id: 90,
      identification: 33333333,
      fullname: "María Operaria",
      email: "operario@villaluz.co",
      phone: "3003333333",
      address: null,
      role: "Operario",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:58.610877Z",
      updated_at: "2026-08-15T15:55:58.609984Z",
      fincas: [
        {
          id: 1042,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Operario",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:58.613040"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: false,
      version_id: 1
    },
    {
      id: 91,
      identification: 44444444,
      fullname: "Dr. Martínez Vet",
      email: "veterinario@villaluz.co",
      phone: "3004444444",
      address: null,
      role: "Veterinario",
      status: true,
      approval_status: "Approved",
      finca_id: 1,
      avatar_url: null,
      created_at: "2026-08-15T15:55:58.743600Z",
      updated_at: "2026-08-15T15:55:58.742839Z",
      fincas: [
        {
          id: 1043,
          finca_id: 1,
          finca_name: "Finca Villa Luz",
          finca_type: "Tradicional",
          finca_is_active: true,
          role: "Veterinario",
          is_active: true,
          is_primary: true,
          created_at: "2026-08-15T15:55:58.745999"
        }
      ],
      is_multi_finca: false,
      finca_name: "Finca Villa Luz",
      finca_type: "Tradicional",
      is_system_admin: false,
      version_id: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGlobalUsers.mockResolvedValue(sampleUsers);
    mocks.getUserActivity.mockResolvedValue({ data: [], total_items: 0 });
  });

  it('renders top Bento KPIs and user cards by default', async () => {
    render(<GlobalUsersPage />);

    expect(await screen.findByText('Administrador Sistema')).toBeInTheDocument();
    expect(screen.getByText('Dr. Martínez Vet')).toBeInTheDocument();
    expect(screen.getByText('Total Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores Activos')).toBeInTheDocument();
    expect(screen.getByText('Fincas Conectadas')).toBeInTheDocument();
  });

  it('opens full profile dialog when clicking Ver Perfil Completo on a card', async () => {
    render(<GlobalUsersPage />);

    const action = await screen.findByRole('button', { name: 'Ver detalles de Administrador Sistema' });
    fireEvent.click(action);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Administrador Sistema' })).toBeInTheDocument();
    expect(screen.getAllByText('Finca Villa Luz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
  });

  it('switches between Cards and Table view modes', async () => {
    render(<GlobalUsersPage />);

    await screen.findByText('Administrador Sistema');

    const tableButton = screen.getByRole('button', { name: 'Vista de Tabla' });
    fireEvent.click(tableButton);

    expect(screen.getByText('Listado Maestro de Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Identidad y Contacto')).toBeInTheDocument();

    const cardsButton = screen.getByRole('button', { name: 'Vista de Tarjetas' });
    fireEvent.click(cardsButton);

    expect(await screen.findByText('Administrador Sistema')).toBeInTheDocument();
  });

  it('filters users by search input', async () => {
    render(<GlobalUsersPage />);

    await screen.findByText('Administrador Sistema');

    const searchInput = screen.getByPlaceholderText('Buscar por nombre, correo, cédula o finca...');
    fireEvent.change(searchInput, { target: { value: 'Martínez' } });

    expect(screen.queryByText('Administrador Sistema')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Martínez Vet')).toBeInTheDocument();
  });
});
