import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CRUDForm } from './CRUDForm'

describe('CRUDForm dynamic configuration', () => {
  it('loads asynchronous options and respects field and section visibility', async () => {
    const loadOptions = vi.fn().mockResolvedValue([
      { label: 'Luna', value: 7 },
    ])
    const formData = { kind: 'animal', animal_id: undefined, notes: '' }

    render(
      <CRUDForm
        isOpen
        onOpenChange={vi.fn()}
        title="Evento"
        formData={formData}
        setFormData={vi.fn()}
        formSections={[
          {
            title: 'Animal',
            showIf: (data) => data.kind === 'animal',
            fields: [
              {
                name: 'animal_id',
                label: 'Animal',
                type: 'select',
                loadOptions,
              },
              {
                name: 'notes',
                label: 'Notas ocultas',
                type: 'text',
                showIf: (data) => data.kind === 'notes',
              },
            ],
          },
        ]}
        onSubmit={(event) => event.preventDefault()}
        saving={false}
      />,
    )

    expect(screen.queryByText('Notas ocultas')).not.toBeInTheDocument()
    await waitFor(() => expect(loadOptions).toHaveBeenCalledOnce())
    expect(await screen.findByRole('option', { name: 'Luna' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Animal'), { target: { value: '7' } })
  })
})
