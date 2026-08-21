import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutiveIntelligence } from './ExecutiveIntelligence';

const {
  navigate,
  getDashboard,
  getCompleteDashboardStats,
  getPredictiveInsights,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  getDashboard: vi.fn(),
  getCompleteDashboardStats: vi.fn(),
  getPredictiveInsights: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/features/reporting/api/analytics.service', () => ({
  analyticsService: {
    getDashboard,
    getCompleteDashboardStats,
    getPredictiveInsights,
    runPredictiveAnalysis: vi.fn(),
  },
}));

vi.mock('@/shared/api/offline/ProximitySyncService', () => ({
  proximitySync: {
    getSyncState: () => ({
      lastSyncAt: null,
      messagesReceived: 2,
      messagesSent: 3,
    }),
  },
}));

describe('ExecutiveIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboard.mockResolvedValue({ active_animals: 0, sick_animals: 0 });
    getCompleteDashboardStats.mockResolvedValue({
      alertas_sistema: { valor: 4 },
    });
    getPredictiveInsights.mockResolvedValue({ insight: 'Ganado estable' });
  });

  it('loads real dashboard data and handles an empty herd without NaN', async () => {
    render(<ExecutiveIntelligence />);

    await waitFor(() => expect(getDashboard).toHaveBeenCalled());
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Sin sincronizaciones registradas')).toBeInTheDocument();
    expect(await screen.findByText('Ganado estable')).toBeInTheDocument();
  });

  it('opens the detailed executive report', async () => {
    render(<ExecutiveIntelligence />);

    fireEvent.click(screen.getByRole('button', { name: /ver reporte detallado/i }));
    expect(navigate).toHaveBeenCalledWith('/admin/analytics/executive');
  });
});
