import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/mocks/mocks/server'
import { AppProviders } from './testHelpers'
import AdminAnimalsPage from '@/pages/dashboard/admin/animals'
import { animalsService } from '@/entities/animal/api/animal.service'
import { breedsService } from '@/entities/breed/api/breeds.service'
import { clearMemoryCache } from '@/shared/api/cache-manager'
import {
  __resourceLastFetchAt,
  __endpointBackoffUntil,
  __resourceInflight
} from '@/shared/hooks/resource/useResourceRefetch'

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      identification: '12345678',
      fullname: 'Administrador de Pruebas',
      email: 'admin@example.com',
      role: 'Administrador',
      status: true
    },
    role: 'Administrador',
    name: 'Administrador de Pruebas',
    loading: false,
    isAuthenticated: true,
    hasPermission: () => true,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuthStatus: vi.fn(),
    refreshUser: vi.fn(),
    enableRoleSwitch: false,
    impersonateRole: vi.fn()
  })
}))

// Mock de animals list
const mockAnimals = {
  data: [
    { id: 1, record: 'COL-001', name: 'Lola', gender: 'Hembra', breeds_id: 1, weight: 250, status: 'Vivo', birth_date: '2020-01-01' },
    { id: 2, record: 'COL-002', name: 'Pepe', gender: 'Macho', breeds_id: 2, weight: 300, status: 'Vivo', birth_date: '2021-02-02' }
  ],
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1
}

// Mock de breeds list
const mockBreeds = {
  data: [
    { id: 1, name: 'Holstein' },
    { id: 2, name: 'Jersey' }
  ],
  total: 2,
  page: 1,
  limit: 200,
  totalPages: 1
}

const mockUser = {
  id: 1,
  username: 'admin',
  fullname: 'Administrador Sistema',
  role: 'Administrador',
  finca_id: 1
}

describe('Módulo Animales — Integración', () => {
  beforeEach(async () => {
    // Esperar a que se asienten las promesas pendientes del test anterior para evitar contaminación
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Resetear completamente las caches persistidas de JSDOM localStorage y sessionStorage
    localStorage.clear()
    sessionStorage.clear()

    // Limpiar caché HTTP en memoria a nivel de Axios
    clearMemoryCache()

    // Resetear completamente las caches en memoria de BaseService singleton
    await animalsService.clearCache();
    await breedsService.clearCache();
    
    // Desactivar caché por completo durante los tests de integración para evitar colisiones asíncronas
    (animalsService as any).options.enableCache = false;
    (breedsService as any).options.enableCache = false;

    // Resetear las caches y limitadores de tasa a nivel de hook de useResource
    __resourceLastFetchAt.clear()
    __endpointBackoffUntil.clear()
    __resourceInflight.clear()

    // Interceptar llamadas API en MSW
    server.use(
      http.get('/api/v1/auth/me', () => {
        return HttpResponse.json({ user: mockUser })
      }),
      http.get('/api/v1/animals', () => {
        return HttpResponse.json(mockAnimals)
      }),
      http.get('/api/v1/breeds', () => {
        return HttpResponse.json(mockBreeds)
      }),
      http.post('/api/v1/animals', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({ id: 3, ...body }, { status: 201 })
      }),
      http.delete('/api/v1/animals/:id', () => {
        return HttpResponse.json({ success: true })
      })
    )
  })

  it('carga y muestra la lista de animales', async () => {
    render(<AdminAnimalsPage />, { wrapper: AppProviders })
    
    // Esperar a que se carguen los datos
    await screen.findByText('COL-001', {}, { timeout: 4000 })
    await screen.findByText('COL-002', {}, { timeout: 4000 })

    expect(screen.getByText('COL-001')).toBeInTheDocument()
    expect(screen.getByText('COL-002')).toBeInTheDocument()
  })

  it('abre el modal de creación al hacer clic en Nuevo', async () => {
    render(<AdminAnimalsPage />, { wrapper: AppProviders })
    
    // Esperar a que carguen los datos
    await screen.findByText('COL-001', {}, { timeout: 4000 })

    // Buscar y hacer clic en el botón Nuevo (usando el aria-label accesible robusto)
    const newBtn = screen.getByRole('button', { name: /crear nuevo registro/i })
    await userEvent.click(newBtn)

    // Esperar y verificar que el modal con el título "Crear Animal" se abre
    await screen.findByText('Crear Animal', {}, { timeout: 4000 })
    
    // Usar ID único para evitar colisiones de etiquetas con cabeceras de tabla en JSDOM
    const recordInput = document.getElementById('record')
    expect(recordInput).toBeInTheDocument()
  })

  it('muestra error cuando falla la API de carga', async () => {
    server.use(
      http.get('/api/v1/animals', () => {
        return new HttpResponse('Error interno', { status: 500 })
      })
    )

    render(<AdminAnimalsPage />, { wrapper: AppProviders })
    
    // Esperar a que se muestre el contenedor de Error
    await screen.findByText('Error de Sistema', {}, { timeout: 4000 })
    expect(screen.getByText(/status code 500/i)).toBeInTheDocument()
  })
})
