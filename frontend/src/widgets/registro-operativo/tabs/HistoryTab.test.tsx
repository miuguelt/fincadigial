import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HistoryTab } from './HistoryTab';
import type { HistoryRecord } from '../types';

const treatmentRecord: HistoryRecord = {
  id: 'treatment-18',
  type: 'treatment',
  date: '2026-09-08',
  animalId: 21,
  animalLabel: 'BOV-021 - Holstein',
  entityId: 4,
  entityLabel: 'Antibiótico retiro',
  details: 'Antibiótico retiro · 10 ml · Cada 12 h',
  notes: 'Aplicar después del ordeño',
  raw: {
    id: 18,
    animal_id: 21,
    medication_treatments: [{ medication_id: 4, quantity: 2 }],
    treatment_date: '2026-09-08',
    dose: '10 ml',
  },
};

describe('HistoryTab', () => {
  it('opens the complete record detail when a history item is clicked', async () => {
    const user = userEvent.setup();

    render(<HistoryTab records={[treatmentRecord]} loading={false} />);

    await user.click(screen.getByRole('button', { name: /ver detalle de tratamiento/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /detalle de tratamiento/i })).toBeInTheDocument();
    expect(screen.getAllByText('BOV-021 - Holstein')).toHaveLength(2);
    expect(screen.getAllByText('Aplicar después del ordeño')).toHaveLength(2);
    expect(screen.getByText('Antibiótico retiro')).toBeInTheDocument();
    expect(screen.getByText('Medicamentos aplicados')).toBeInTheDocument();
    expect(screen.getByText(/quantity/i)).toBeInTheDocument();
  });
});
