import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertsPage } from './AlertsPage';

const { showToast, getAlertsPage, getAlertStats, evaluateAlerts, markAsRead, markAllAsRead } = vi.hoisted(() => ({
  showToast: vi.fn(),
  getAlertsPage: vi.fn(),
  getAlertStats: vi.fn(),
  evaluateAlerts: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/entities/alert/api/alert.service', () => ({
  alertService: {
    getAlertsPage,
    getAlertStats,
    evaluateAlerts,
    markAsRead,
    markAllAsRead,
  },
}));
vi.mock('@/widgets/alerts/AlertStatsCards', () => ({
  AlertStatsCards: () => <div data-testid="alert-stats" />,
}));
vi.mock('@/widgets/alerts/AlertFilterBar', () => ({
  AlertFilterBar: () => <div data-testid="alert-filters" />,
}));
vi.mock('@/shared/components/notifications/components/AlertNotificationCard', () => ({
  AlertNotificationCard: ({ alert }: any) => <div>{alert.message}</div>,
}));

describe('AlertsPage', () => {
  beforeEach(() => {
    showToast.mockClear();
    evaluateAlerts.mockReset();
    markAsRead.mockReset();
    markAllAsRead.mockReset();
    getAlertsPage.mockResolvedValue({
      items: [
        {
          id: 1,
          alert_type: 'sanidad',
          priority: 'Alta',
          message: 'Control pendiente',
          recommendation: 'Pesar animal',
          triggered_at: '2026-11-21T10:00:00Z',
          is_read: false,
        },
      ],
      total: 1,
    });
    getAlertStats.mockResolvedValue({
      total: 1,
      unread: 1,
      criticalUnread: 0,
      byPriority: {},
      byType: {},
    });
  });

  it('usa botones de encabezado de al menos 44 px y muestra errores reales del servidor', async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);

    const evaluateBtn = await screen.findByRole('button', { name: /evaluar ahora/i });
    const markAllBtn = await screen.findByRole('button', { name: /marcar todas leídas|todas leídas/i });
    expect(evaluateBtn.className).toContain('min-h-[44px]');
    expect(markAllBtn.className).toContain('min-h-[44px]');

    evaluateAlerts.mockRejectedValueOnce({
      response: { status: 429, data: { message: 'Espera un minuto antes de reevaluar alertas' } },
    });
    await user.click(evaluateBtn);
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Espera un minuto antes de reevaluar alertas', 'error'),
    );

    markAllAsRead.mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Fallo al actualizar alertas en PostgreSQL' } },
    });
    await user.click(markAllBtn);
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Fallo al actualizar alertas en PostgreSQL', 'error'),
    );
  });
});
