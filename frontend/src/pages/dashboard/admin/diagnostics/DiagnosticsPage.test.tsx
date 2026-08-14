import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiagnosticsPage from './index';

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('@/shared/api/apiFetch', () => ({ apiFetch: mocks.apiFetch }));

describe('DiagnosticsPage', () => {
  beforeEach(() => {
    mocks.apiFetch.mockResolvedValue({
      data: {
        data: {
          status: 'healthy',
          timestamp: '2026-08-12T12:00:00Z',
          response_time_ms: 18,
          summary: { failed_checks: 0, warning_checks: 0, total_checks: 4 },
          checks: {
            database: { status: 'healthy', response_time_ms: 4 },
            cache: { status: 'healthy', response_time_ms: 2 },
            celery: { status: 'healthy', workers_active: 1 },
            system: { status: 'healthy' },
          },
        },
      },
    });
  });

  it('renders live health checks instead of a blank page', async () => {
    render(<DiagnosticsPage />);

    expect(await screen.findByRole('heading', { name: 'Diagnóstico del Sistema' })).toBeInTheDocument();
    expect(await screen.findByText('Base de datos')).toBeInTheDocument();
    expect(screen.getByText('Caché')).toBeInTheDocument();
    expect(screen.getByText('Procesamiento asíncrono')).toBeInTheDocument();
    expect(screen.getAllByText('Saludable').length).toBeGreaterThanOrEqual(3);
  });
});
