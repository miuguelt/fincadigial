import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResumenOperativo } from './ResumenOperativo';
import type { HistoryRecord } from '../types';

function diseaseRecord(
  id: string,
  date: string,
  status: string,
): HistoryRecord {
  return {
    id,
    type: 'disease',
    date,
    animalId: 17,
    animalLabel: 'Luna',
    details: status,
    raw: { status },
  };
}

describe('ResumenOperativo', () => {
  it('uses the latest diagnosis of each animal instead of counting an old open diagnosis', () => {
    render(
      <ResumenOperativo
        records={[
          diseaseRecord('latest', '2026-08-12', 'Recuperado'),
          diseaseRecord('older', '2026-08-10', 'Activo'),
        ]}
        cropActivities={[]}
        loading={false}
      />,
    );

    const healthTile = screen.getByText('Animales con diagnóstico abierto').closest('div');
    expect(healthTile).not.toBeNull();
    expect(within(healthTile as HTMLElement).getByText('0')).toBeInTheDocument();
  });
});
