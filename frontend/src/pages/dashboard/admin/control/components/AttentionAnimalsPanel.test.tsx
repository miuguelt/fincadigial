import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AttentionAnimalsPanel } from './AttentionAnimalsPanel';
import type { AttentionAnimalView } from './attentionAnimals.model';

vi.mock('@/entities/animal/ui', () => ({
  AnimalLink: ({ label }: { label: string }) => <span>Ficha de {label}</span>,
}));

const grave: AttentionAnimalView = {
  animalId: 7,
  label: 'VL-007 · Luna',
  status: 'Malo',
  severity: 'alta',
  lastCheckDate: '2026-07-08',
  daysSinceCheck: 15,
  description: 'No come desde el martes',
};

const observacion: AttentionAnimalView = {
  animalId: 12,
  label: 'VL-012 · Manchas',
  status: 'Regular',
  severity: 'media',
  lastCheckDate: '2026-08-16',
  daysSinceCheck: 1,
  description: '',
};

describe('AttentionAnimalsPanel', () => {
  it('muestra cuáles son los animales, con estado y hace cuánto se revisaron', () => {
    render(
      <AttentionAnimalsPanel animals={[grave, observacion]} onReview={vi.fn()} />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(within(items[0]).getByText('VL-007 · Luna')).toBeInTheDocument();
    expect(within(items[0]).getByText('Grave')).toBeInTheDocument();
    expect(within(items[0]).getByText(/Malo/)).toBeInTheDocument();
    expect(within(items[0]).getByText(/hace 15 días/)).toBeInTheDocument();
    expect(within(items[0]).getByText('No come desde el martes')).toBeInTheDocument();

    expect(within(items[1]).getByText('VL-012 · Manchas')).toBeInTheDocument();
    expect(within(items[1]).getByText('En observación')).toBeInTheDocument();
    expect(within(items[1]).getByText(/ayer/)).toBeInTheDocument();
  });

  it('permite registrar la revisión del animal exacto', async () => {
    const onReview = vi.fn();
    const user = userEvent.setup();
    render(<AttentionAnimalsPanel animals={[grave, observacion]} onReview={onReview} />);

    const items = screen.getAllByRole('listitem');
    await user.click(
      within(items[1]).getByRole('button', { name: /Registrar revisión/ }),
    );

    expect(onReview).toHaveBeenCalledWith(12);
  });

  it('abre la ficha del animal desde la misma fila', () => {
    render(<AttentionAnimalsPanel animals={[grave]} onReview={vi.fn()} />);
    expect(screen.getByText('Ficha de VL-007 · Luna')).toBeInTheDocument();
  });

  it('oculta la acción de registrar cuando el usuario no puede guardar', () => {
    render(
      <AttentionAnimalsPanel animals={[grave]} canRecord={false} onReview={vi.fn()} />,
    );
    expect(
      screen.queryByRole('button', { name: /Registrar revisión/ }),
    ).not.toBeInTheDocument();
  });

  it('confirma que ningún animal necesita atención cuando la lista está vacía', () => {
    render(<AttentionAnimalsPanel animals={[]} onReview={vi.fn()} />);
    expect(
      screen.getByText('Ningún animal necesita atención en este momento.'),
    ).toBeInTheDocument();
  });

  it('no afirma que todo está bien cuando la fuente de datos falló', () => {
    render(<AttentionAnimalsPanel animals={[]} unavailable onReview={vi.fn()} />);
    expect(
      screen.queryByText('Ningún animal necesita atención en este momento.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/No pudimos consultar el estado de los animales/),
    ).toBeInTheDocument();
  });

  it('avisa cuando la revisión no tiene fecha en vez de inventar los días', () => {
    render(
      <AttentionAnimalsPanel
        animals={[{ ...grave, lastCheckDate: '', daysSinceCheck: null }]}
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByText(/Sin fecha de revisión/)).toBeInTheDocument();
  });
});
