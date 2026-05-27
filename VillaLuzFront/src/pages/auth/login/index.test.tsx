import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './index';
import { loginUser, getUserProfile, normalizeRole } from '@/features/auth/api/auth.service';
import api from '@/shared/api/client';
import * as useAuthModule from '@/features/auth/model/useAuth';
import { AuthProvider } from '@/app/providers/AuthenticationContext';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

// Mocks
vi.mock('@/features/auth/api/auth.service', () => ({
  __esModule: true,
  loginUser: vi.fn(),
  getUserProfile: vi.fn(),
  normalizeRole: vi.fn((role: any) => role),
}));
vi.mock('@/shared/api/client', () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

// Cast mocks
const mockLoginUser = vi.mocked(loginUser);
const mockGetUserProfile = vi.mocked(getUserProfile);
const mockNormalizeRole = vi.mocked(normalizeRole);
const mockApi = api as unknown as { get: any };

// Setup QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderComponent = async (initialEntries = ['/login']) => {
  let rendered;
  await act(async () => {
    rendered = render(
      <MemoryRouter
        initialEntries={initialEntries}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Index />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  });
  return rendered!;
};

describe('Login Page', () => {
  let useAuthSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('auth:session_active', '1');

    useAuthSpy = vi.spyOn(useAuthModule, 'useAuth');
    useAuthSpy.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    } as any);

    // Default mock responses
    mockLoginUser.mockResolvedValue({ status: 200, data: { access_token: 'mock-token', user: { id: 1, role: 'Administrador', identification: 12345678, email: 'test@example.com', status: true } } } as any);
    mockGetUserProfile.mockResolvedValue({ status: 200, data: { user: { id: 1, role: 'Administrador', identification: 12345678, email: 'test@example.com', status: true } } } as any);
    mockApi.get.mockResolvedValue({ data: { user: { id: 1, role: 'Administrador' } } } as any);

    // Ensure normalizeRole behaves as identity by default
    mockNormalizeRole.mockImplementation((role: any) => role);
  });

  afterEach(() => {
    useAuthSpy.mockRestore();
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();

    // Make login resolution slightly delayed
    mockLoginUser.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ status: 200, data: { access_token: 't', user: { id: 1, role: 'Administrador' } } } as any), 50)));

    await renderComponent();

    await user.type(screen.getByLabelText(/identific/i), '12345678');
    await user.type(screen.getByLabelText(/contrase/i), 'password123');
    
    // Direct form submit for deterministic JSDOM testing
    const form = screen.getByRole('button', { name: /iniciar/i }).closest('form')!;
    fireEvent.submit(form);

    // Wait for loading overlay to take over (button should disappear)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument();
    });
  });

  it('renders login form correctly', () => {
    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Index />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/identific/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contrase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument();
  });

  it('submits login form and triggers auth flow on success', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();
    useAuthSpy.mockReturnValue({
      user: null,
      login: mockLogin,
      logout: vi.fn(),
      isLoading: false,
    } as any);

    await renderComponent();

    await user.type(screen.getByLabelText(/identific/i), '12345678');
    await user.type(screen.getByLabelText(/contrase/i), 'password123');
    
    const form = screen.getByRole('button', { name: /iniciar/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith({ identification: '12345678', password: 'password123' } as any);
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('shows error message on failed login (401)', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLoginUser.mockRejectedValue({ status: 401, message: 'Credenciales incorrectas' });

    try {
      await renderComponent();

      await user.type(screen.getByLabelText(/identific/i), '12345678');
      await user.type(screen.getByLabelText(/contrase/i), 'wrongpassword');
      
      const form = screen.getByRole('button', { name: /iniciar/i }).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
