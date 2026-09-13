import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

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

const requiredSections = [
  {
    title: 'Datos',
    fields: [
      { name: 'record', label: 'Registro', type: 'text', required: true },
      {
        name: 'breed_id',
        label: 'Raza',
        type: 'select',
        required: true,
        options: [{ value: 1, label: 'Brahman' }],
      },
    ],
  },
]

// Réplica mínima del contrato AdminCRUDPage → CRUDForm: cada cambio de valor
// dispara validación en vivo y publica un objeto de errores nuevo.
function Harness() {
  const [formData, setFormData] = useState<Record<string, any>>({ record: '', breed_id: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const updateField = (_field: any, value: any) => {
    const next = { ...formData, [String(_field.name)]: value }
    setFormData(next)
    const errors: Record<string, string> = {}
    if (!String(next.record ?? '').trim()) errors.record = 'Campo obligatorio.'
    if (!next.breed_id) errors.breed_id = 'Debe seleccionar una raza.'
    setFieldErrors(errors)
  }

  return (
    <CRUDForm
      isOpen
      onOpenChange={vi.fn()}
      title="Crear animal"
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      onFieldValueChange={updateField}
      formSections={requiredSections as any}
      onSubmit={(event) => event.preventDefault()}
      saving={false}
    />
  )
}

describe('CRUDForm no roba el foco mientras se escribe', () => {
  it('mantiene el foco en el campo que se edita aunque otros obligatorios estén vacíos', () => {
    render(<Harness />)
    const record = screen.getByRole('textbox', { name: /registro/i })
    const breed = screen.getByRole('combobox', { name: /raza/i })

    record.focus()
    expect(record).toHaveFocus()

    fireEvent.change(record, { target: { value: 'REC0001' } })

    // Con errores vivos el efecto no debe saltar al primer campo inválido:
    // la persona aún está escribiendo.
    expect(record).toHaveFocus()
    expect(breed).not.toHaveFocus()
  })

  it('sigue enfocando el primer campo con error cuando nadie está editando (ej. tras un submit)', () => {
    render(<Harness />)
    const record = screen.getByRole('textbox', { name: /registro/i })
    const breed = screen.getByRole('combobox', { name: /raza/i })

    // El foco está en el botón (no en un campo editable): se revalida y
    // debería llevar el foco al primer error como en el envío fallido.
    const submit = screen.getByRole('button', { name: /crear registro/i })
    submit.focus()
    expect(submit).toHaveFocus()

    fireEvent.change(record, { target: { value: 'REC0001' } })

    expect(breed).toHaveFocus()
  })

  it('deshabilita un campo dependiente cuando el campo padre no tiene valor', () => {
    const handleValueChange = vi.fn()
    render(
      <CRUDForm
        isOpen
        onOpenChange={vi.fn()}
        title="Tratamiento"
        formData={{ animal_id: undefined, animal_disease_id: undefined }}
        setFormData={vi.fn()}
        onFieldValueChange={handleValueChange}
        formSections={[
          {
            title: 'Datos',
            fields: [
              {
                name: 'animal_id',
                label: 'Res',
                type: 'select',
                options: [{ label: 'Vaca 104', value: 10 }],
              },
              {
                name: 'animal_disease_id',
                label: 'Caso clínico',
                type: 'select',
                dependsOn: 'animal_id',
                options: [{ label: 'Caso Mastitis', value: 1 }],
              },
            ],
          },
        ]}
        onSubmit={(e) => e.preventDefault()}
        saving={false}
      />
    )

    const caseSelect = screen.getByLabelText(/caso clínico/i) as HTMLSelectElement
    expect(caseSelect.disabled).toBe(true)
  })

  it('renderiza sugerencias rápidas (chips) y permite autocompletar al hacer clic', () => {
    const handleValueChange = vi.fn()
    render(
      <CRUDForm
        isOpen
        onOpenChange={vi.fn()}
        title="Tratamiento"
        formData={{ diagnosis: '' }}
        setFormData={vi.fn()}
        onFieldValueChange={handleValueChange}
        formSections={[
          {
            title: 'Datos',
            fields: [
              {
                name: 'diagnosis',
                label: 'Diagnóstico',
                type: 'text',
                suggestions: ['Mastitis', 'Purgado'],
              },
            ],
          },
        ]}
        onSubmit={(e) => e.preventDefault()}
        saving={false}
      />
    )

    expect(screen.getByRole('button', { name: 'Mastitis' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Purgado' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mastitis' }))
    expect(handleValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'diagnosis' }),
      'Mastitis'
    )
  })
})
