import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MilkModal } from './MilkModal';
import { ToastProvider } from '@/app/providers/ToastContext';

describe('MilkModal', () => {
  const animals = [
    { id: 1, record: 'TORO-01', sex: 'Macho', is_lactating: false },
    { id: 2, record: 'VACA-SECA', sex: 'Hembra', is_lactating: false },
    { id: 3, record: 'VACA-LECHERA', sex: 'Hembra', is_lactating: true },
  ];

  it('solo muestra vacas que están en lactancia activa', () => {
    render(
      <ToastProvider>
        <MilkModal
          open={true}
          onClose={vi.fn()}
          form={{ animalId: '', liters: '', session: 'Mañana', date: '2026-09-21', notes: '' }}
          setForm={vi.fn()}
          animals={animals}
          saving={false}
          onSubmit={vi.fn()}
        />
      </ToastProvider>
    );

    // VACA-LECHERA debe estar presente en las opciones
    expect(screen.getByText(/VACA-LECHERA/i)).toBeInTheDocument();

    // TORO-01 y VACA-SECA no deben estar disponibles en las opciones
    expect(screen.queryByText(/TORO-01/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/VACA-SECA/i)).not.toBeInTheDocument();
  });

  it('muestra aviso cuando no hay vacas en lactancia activa', () => {
    const noLactating = [
      { id: 1, record: 'TORO-01', sex: 'Macho', is_lactating: false },
      { id: 2, record: 'VACA-SECA', sex: 'Hembra', is_lactating: false },
    ];

    render(
      <ToastProvider>
        <MilkModal
          open={true}
          onClose={vi.fn()}
          form={{ animalId: '', liters: '', session: 'Mañana', date: '2026-09-21', notes: '' }}
          setForm={vi.fn()}
          animals={noLactating}
          saving={false}
          onSubmit={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/No hay vacas en lactancia activa/i)).toBeInTheDocument();
  });
});
