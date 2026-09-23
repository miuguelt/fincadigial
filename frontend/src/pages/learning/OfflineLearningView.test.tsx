import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OfflineLearningView from './OfflineLearningView';
import { BUILTIN_QUICK_GUIDES, OFFICIAL_REPOSITORIES } from './data/builtinOfficialGuides';

// Mock del servicio y dependencias
vi.mock('@/entities/campesino/api/campesino.service', () => ({
  offlineLearningService: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ role: 'Administrador' }),
}));

vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('OfflineLearningView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el título principal del módulo y las tres pestañas', async () => {
    render(<OfflineLearningView />);

    expect(screen.getByText('Aprender en la Finca')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Guías Rápidas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Biblioteca/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Repositorios Oficiales/i })).toBeInTheDocument();
  });

  it('muestra las guías rápidas incorporadas por defecto con garantía offline', async () => {
    render(<OfflineLearningView />);

    const firstGuide = BUILTIN_QUICK_GUIDES[0];
    expect(screen.getByText(firstGuide.title)).toBeInTheDocument();
    expect(screen.getAllByText(firstGuide.entity)[0]).toBeInTheDocument();
  });

  it('permite buscar guías en tiempo real con el buscador', async () => {
    const user = userEvent.setup();
    render(<OfflineLearningView />);

    const searchInput = screen.getByPlaceholderText(/Buscar por tema, aforo, aftosa/i);
    await user.type(searchInput, 'aforo');

    expect(screen.getByText(/Aforo de Potrero con Marco de 1 m²/i)).toBeInTheDocument();
    expect(screen.queryByText(/Atención del Ternero al Nacer/i)).not.toBeInTheDocument();
  });

  it('filtra por categorías ganaderas al hacer clic en las píldoras', async () => {
    const user = userEvent.setup();
    render(<OfflineLearningView />);

    const catButton = screen.getByRole('button', { name: 'Ordeño y Calidad' });
    await user.click(catButton);

    expect(screen.getByText(/Rutina de Ordeño Limpio y Control de Mastitis/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aforo de Potrero/i)).not.toBeInTheDocument();
  });

  it('abre el modal de lectura de campo al pulsar Consultar Guía', async () => {
    const user = userEvent.setup();
    render(<OfflineLearningView />);

    const openButtons = screen.getAllByRole('button', { name: /Consultar Guía de Campo/i });
    await user.click(openButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Procedimiento operativo paso a paso/i)).toBeInTheDocument();
      expect(screen.getByText(/Herramientas e insumos necesarios/i)).toBeInTheDocument();
    });
  });

  it('muestra la sección de repositorios oficiales con AGROSAVIA, ICA, FEDEGÁN, SENA y CIPAV', async () => {
    const user = userEvent.setup();
    render(<OfflineLearningView />);

    const repoTab = screen.getByRole('tab', { name: /Repositorios Oficiales/i });
    await user.click(repoTab);

    await waitFor(() => {
      OFFICIAL_REPOSITORIES.forEach((repo) => {
        expect(screen.getByText(repo.name)).toBeInTheDocument();
      });
      expect(screen.getByText(/Literatura Agropecuaria Colombiana Oficial/i)).toBeInTheDocument();
    });
  });
});
