import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MedicationDetailContent } from './components/MedicationDetailContent';
import { MedicationsHeaderBanner } from './components/MedicationsHeaderBanner';
import { inventoryService } from '@/entities/inventory/api/inventory.service';

// Mock de navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock de SanidadTabs para simplificar el banner
vi.mock('@/widgets/dashboard/treatments/SanidadTabs', () => ({
  SanidadTabs: () => <div data-testid="sanidad-tabs-mock">Pestañas Sanidad</div>,
}));

// Mock de inventoryService
vi.mock('@/entities/inventory/api/inventory.service', () => ({
  inventoryService: {
    getLots: vi.fn(),
  },
}));

describe('Medications UX y Catálogo de Referencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMedication = {
    id: 46,
    name: 'Curagusan / Larvicida Aerosol Tópico',
    description: 'Antiséptico, desinfectante y repelente de moscas en spray.',
    dosis: '1 aplicación tópica cubriendo la herida',
    availability: true,
    route_administration_id: 3,
    indications: 'Heridas abiertas, gusaneras, ombligos de terneros recién nacidos',
    contraindications: 'No aplicar en ojos ni mucosas sensibles',
    created_at: '2026-10-01T12:14:00Z',
  };

  describe('MedicationDetailContent', () => {
    it('muestra el banner pedagógico indicando que es una ficha de catálogo (vademécum)', async () => {
      vi.mocked(inventoryService.getLots).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <MedicationDetailContent
            medication={mockMedication}
            routeLabel="Tópica"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Ficha de Catálogo \(Vademécum de Referencia\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/especificaciones y dosis autorizadas para formular en la finca/i)).toBeInTheDocument();
      expect(screen.getByText('#46')).toBeInTheDocument();
      expect(screen.getByText('Tópica')).toBeInTheDocument();
      expect(screen.getByText(mockMedication.indications)).toBeInTheDocument();
      expect(screen.getByText(mockMedication.contraindications)).toBeInTheDocument();
    });

    it('calcula y muestra las existencias físicas en finca cuando hay lotes registrados', async () => {
      vi.mocked(inventoryService.getLots).mockResolvedValueOnce([
        {
          id: 101,
          medication_id: 46,
          lot_number: 'LOTE-2026-A',
          quantity: 100,
          current_quantity: 85,
          unit: 'ml',
          expiry_date: '2027-05-15',
        },
        {
          id: 102,
          medication_id: 46,
          lot_number: 'LOTE-2026-B',
          quantity: 50,
          current_quantity: 50,
          unit: 'ml',
          expiry_date: '2027-09-20',
        },
      ]);

      render(
        <MemoryRouter>
          <MedicationDetailContent
            medication={mockMedication}
            routeLabel="Tópica"
          />
        </MemoryRouter>
      );

      // Esperar a que se resuelva la consulta de lotes
      await waitFor(() => {
        expect(screen.getByText('135')).toBeInTheDocument(); // 85 + 50
        expect(screen.getByText('ml')).toBeInTheDocument();
      });

      expect(screen.getByText(/2 lotes registrados/i)).toBeInTheDocument();
      expect(screen.getByText(/Próximo vencimiento:/i)).toBeInTheDocument();
      expect(screen.getByText(/Lote LOTE-2026-A/i)).toBeInTheDocument();
    });

    it('muestra estado pedagógico cuando no hay existencias físicas en la finca', async () => {
      vi.mocked(inventoryService.getLots).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <MedicationDetailContent
            medication={mockMedication}
            routeLabel="Tópica"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sin existencias físicas registradas en la finca \(0 unidades\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Para aplicarlo a tus animales, registra la compra o ingreso del lote físico/i)).toBeInTheDocument();
    });

    it('permite navegar directamente al inventario filtrando por el medicamento', async () => {
      vi.mocked(inventoryService.getLots).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <MedicationDetailContent
            medication={mockMedication}
            routeLabel="Tópica"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Ver en Inventario/i })).toBeInTheDocument();
      });

      const inventoryBtn = screen.getByRole('button', { name: /Ver en Inventario/i });
      fireEvent.click(inventoryBtn);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/admin/inventory?search=' + encodeURIComponent(mockMedication.name))
      );
    });

    it('permite navegar directamente a crear lote en inventario', async () => {
      vi.mocked(inventoryService.getLots).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <MedicationDetailContent
            medication={mockMedication}
            routeLabel="Tópica"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Ingresar Stock/i })).toBeInTheDocument();
      });

      const addStockBtn = screen.getByRole('button', { name: /Ingresar Stock/i });
      fireEvent.click(addStockBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/inventory?create=1');
    });
  });

  describe('MedicationsHeaderBanner', () => {
    it('renderiza la explicación de catálogo vs stock físico y botón directo al inventario', () => {
      render(
        <MemoryRouter>
          <MedicationsHeaderBanner />
        </MemoryRouter>
      );

      expect(screen.getByTestId('sanidad-tabs-mock')).toBeInTheDocument();
      expect(screen.getByText(/Catálogo de Referencia \(Vademécum de Medicamentos\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Esta lista reúne los posibles medicamentos aprobados/i)).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /Ver Stock en Inventario/i });
      fireEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/inventory?product_type=Medicamento');
    });
  });
});
