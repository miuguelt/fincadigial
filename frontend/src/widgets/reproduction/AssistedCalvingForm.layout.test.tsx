import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssistedCalvingForm from './AssistedCalvingForm';

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@/entities/animal/model/useAnimals', () => ({
  useAnimals: () => ({ animals: [], loading: false }),
}));

vi.mock('@/entities/reproduction/api/reproduction.service', () => ({
  reproductionService: {
    create: vi.fn(),
    createOffspring: vi.fn(),
    registerCalfAnimal: vi.fn(),
  },
}));

describe('distribución adaptable del registro de parto', () => {
  it('expone contenedores semánticos para adaptar el formulario por su ancho real', () => {
    const { container } = render(<AssistedCalvingForm />);

    expect(screen.getByTestId('assisted-calving-form')).toHaveClass('assisted-calving');
    expect(container.querySelector('.assisted-calving__layout')).toBeInTheDocument();
    expect(container.querySelectorAll('.assisted-calving__panel')).toHaveLength(2);
    expect(container.querySelectorAll('.assisted-calving__field-grid')).toHaveLength(3);
  });

  it('usa consultas de contenedor y conserva una sola columna como base móvil', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/widgets/reproduction/AssistedCalvingForm.css'),
      'utf8'
    );

    expect(css).toMatch(/container-type:\s*inline-size/);
    expect(css).toMatch(/\.assisted-calving__layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
    expect(css).toMatch(/@container assisted-calving \(min-width:\s*64rem\)/);
    expect(css).toMatch(/@container calving-panel \(min-width:\s*32rem\)/);
  });

  it('abre el diálogo casi a todo el ancho disponible con un límite cómodo en escritorio', () => {
    const pageSource = [
      'src/pages/dashboard/admin/reproduction/index.tsx',
      'src/pages/dashboard/admin/reproduction/ReproductionHubModals.tsx',
    ]
      .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))
      .join('\n');

    expect(pageSource).toMatch(/<DialogContent[\s\S]*?fullWidth[\s\S]*?assisted-calving-dialog/);
    expect(pageSource).toContain('max-w-[1180px]');
  });
});
