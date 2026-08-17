import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CRUDToolbar } from './CRUDToolbar'

/**
 * El slot `customToolbar` de inventario es un bloque de ancho completo (chips de
 * filtro). Colgado del grupo de acciones —que no se encoge— empujaba el ancho
 * del encabezado más allá del viewport y aplastaba el título. Con
 * `toolbarPlacement="row"` baja a su propia fila y deja de competir por el
 * ancho de la búsqueda.
 */
describe('CRUDToolbar: ubicación del slot personalizado', () => {
  const baseProps = {
    searchQuery: '',
    setSearchQuery: vi.fn(),
    onOpenCreate: vi.fn(),
    customToolbar: <button type="button">Chips de filtro</button>,
  }

  it('por defecto lo deja junto al botón de crear', () => {
    render(<CRUDToolbar {...baseProps} />)

    const custom = screen.getByRole('button', { name: 'Chips de filtro' })
    const create = screen.getByRole('button', { name: /crear/i })
    const cluster = create.parentElement as HTMLElement

    expect(cluster.contains(custom)).toBe(true)
  })

  it('con placement "row" lo saca del grupo de acciones y ocupa su propia fila', () => {
    render(<CRUDToolbar {...baseProps} toolbarPlacement="row" />)

    const custom = screen.getByRole('button', { name: 'Chips de filtro' })
    const create = screen.getByRole('button', { name: /crear/i })
    const cluster = create.parentElement as HTMLElement

    expect(cluster.contains(custom)).toBe(false)

    const row = custom.parentElement as HTMLElement
    expect(row.className).toContain('w-full')
  })
})
