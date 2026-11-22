import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AforoCalculatorModal } from './AforoCalculatorModal';
import { fieldService } from '@/entities/field/api/field.service';

vi.mock('@/entities/field/api/field.service', () => ({
  fieldService: {
    getFields: vi.fn(),
    updateField: vi.fn(),
  },
}));

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const mockFields = [
  {
    id: 10,
    name: 'Potrero La Vega',
    area: '2.0',
    animal_count: 20,
    state: 'Disponible',
  },
  {
    id: 11,
    name: 'Potrero El Guayabal',
    area: '3.5',
    animal_count: 0,
    state: 'En descanso',
  },
];

describe('AforoCalculatorModal - Zootecnia Forrajera y Capacidad UGM', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(fieldService.getFields).mockResolvedValue(mockFields as any);
    vi.mocked(fieldService.updateField).mockResolvedValue({ id: 10 } as any);
  });

  const renderModal = (isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AforoCalculatorModal
          isOpen={isOpen}
          onClose={vi.fn()}
          initialField={mockFields[0] as any}
          fields={mockFields as any}
        />
      </QueryClientProvider>
    );
  };

  it('no renderiza nada si isOpen es falso', () => {
    const { container } = renderModal(false);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza potrero, muestras de corte y cálculos zootécnicos iniciales', () => {
    renderModal(true);

    expect(screen.getByText(/calculadora de aforo y carga de pastos/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /potrero la vega/i })).toBeInTheDocument();

    // 3 muestras iniciales por defecto: 1.2, 1.5, 1.4 -> promedio 1.37 kg/m²
    expect(screen.getByText('Muestra #1')).toBeInTheDocument();
    expect(screen.getByText('Muestra #2')).toBeInTheDocument();
    expect(screen.getByText('Muestra #3')).toBeInTheDocument();

    expect(screen.getByText('Producción Promedio')).toBeInTheDocument();
    expect(screen.getByText('1.37')).toBeInTheDocument();
    expect(screen.getByText(/13[.,]?667/)).toBeInTheDocument(); // kg/ha

    // Botones con dimensiones táctiles móviles
    const saveBtn = screen.getByRole('button', { name: /guardar aforo en potrero/i });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveClass('min-h-[44px]');
  });

  it('permite añadir una nueva muestra de corte y recalcular la oferta forrajera', async () => {
    const user = userEvent.setup();
    renderModal(true);

    const addBtn = screen.getByRole('button', { name: /añadir muestra/i });
    expect(addBtn).toBeInTheDocument();

    await user.click(addBtn);

    // Ahora deben haber 4 muestras
    expect(screen.getByText('Muestra #4')).toBeInTheDocument();
  });

  it('guarda el aforo registrado en el potrero al presionar Guardar', async () => {
    const user = userEvent.setup();
    renderModal(true);

    const saveBtn = screen.getByRole('button', { name: /guardar aforo en potrero/i });
    await user.click(saveBtn);

    expect(fieldService.updateField).toHaveBeenCalledTimes(1);
    expect(fieldService.updateField).toHaveBeenCalledWith(
      '10',
      expect.objectContaining({
        gauges: expect.stringContaining('Aforo'),
      })
    );
  });
});
