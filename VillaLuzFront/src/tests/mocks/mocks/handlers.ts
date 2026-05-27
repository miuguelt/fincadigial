// [DISABLED IN PRODUCTION] Estos handlers solo se usan en tests unitarios.
// La BD es la única fuente de verdad. En desarrollo usar API real.
if (!import.meta.env.DEV && import.meta.env.PROD) {
  throw new Error('MSW handlers no deben activarse en producción')
}

import { http, HttpResponse } from 'msw'
import {
  mockAnimals,
  mockPotreros,
  mockControles,
  mockIcaReport,
  AnimalContract,
  PotreroContract,
  ControlContract
} from './fixtures/animal'

const API_BASE = '*/api/v1'

export const handlers = [
  // --- AUTHENTICATION ---
  http.get(`${API_BASE}/auth/me`, () => {
    console.log('MSW: Intercepted /auth/me');
    return HttpResponse.json({
      success: true,
      data: { id: 1, fullname: 'Administrador Test', email: 'admin@villaluz.co', role: 'Administrador', finca_id: 1 }
    })
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    console.log('MSW: Intercepted /auth/refresh');
    return HttpResponse.json({
      success: true,
      access_token: 'mock-new-token'
    })
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      access_token: 'mock-token',
      user: { id: 1, fullname: 'Administrador Test', email: 'admin@villaluz.co', role: 'Administrador' }
    })
  }),

  // --- ANIMALS ---
  http.get(`${API_BASE}/animals`, ({ request }) => {
    const url = new URL(request.url)
    const sex = url.searchParams.get('sex')
    
    let filtered = mockAnimals
    if (sex) {
      filtered = mockAnimals.filter(a => a.sex === sex || (a as any).gender === sex)
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
      page: 1,
      per_page: 100
    })
  }),

  http.get(`${API_BASE}/animals/:id`, ({ params }) => {
    const id = Number(params.id)
    const animal = mockAnimals.find(a => a.id === id) || mockAnimals[0]
    return HttpResponse.json({
      success: true,
      data: { ...animal, id }
    })
  }),

  http.post(`${API_BASE}/reproduction/batch`, async ({ request }) => {
    console.log('MSW: Intercepted /reproduction/batch');
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      message: 'Operación masiva completada',
      count: (body as any).animal_ids?.length || 0
    })
  }),

  // --- POTREROS / FIELDS ---
  http.get(`${API_BASE}/fields`, () => {
    return HttpResponse.json({
      success: true,
      data: mockPotreros,
      total: mockPotreros.length
    })
  }),

  // --- ANTERIORES ---
  http.get(`*/api/animales`, () => {
    return HttpResponse.json({
      data: mockAnimals,
      total: mockAnimals.length
    })
  }),

  http.post(`${API_BASE}/animales`, async ({ request }) => {
    const body = await request.json() as Partial<AnimalContract>
    
    if (!body.name || !body.record || !body.especie || !body.birth_date) {
      return HttpResponse.json({
        errors: {
          name: !body.name ? 'Nombre es requerido' : undefined,
          record: !body.record ? 'Registro es requerido' : undefined,
          especie: !body.especie ? 'Especie es requerida' : undefined,
          birth_date: !body.birth_date ? 'Fecha de nacimiento es requerida' : undefined,
        },
        message: 'Validación fallida'
      }, { status: 422 })
    }

    const newAnimal: AnimalContract = {
      id: Math.floor(Math.random() * 1000) + 10,
      name: body.name,
      record: body.record,
      especie: body.especie,
      birth_date: body.birth_date,
      field_id: body.field_id || null,
      sex: body.sex || 'Hembra',
      status: body.status || 'Vivo',
      created_at: new Date().toISOString()
    }
    return HttpResponse.json({ data: newAnimal }, { status: 201 })
  }),

  http.put(`${API_BASE}/animales/:id`, async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as Partial<AnimalContract>
    const animal = mockAnimals.find(a => a.id === id) || mockAnimals[0]
    
    const updatedAnimal: AnimalContract = {
      ...animal,
      ...body,
      id
    }
    return HttpResponse.json({ data: updatedAnimal })
  }),

  http.delete(`${API_BASE}/animales/:id`, () => {
    return HttpResponse.json({ success: true })
  }),

  // --- POTREROS ---
  http.get(`${API_BASE}/potreros`, () => {
    return HttpResponse.json({
      data: mockPotreros,
      total: mockPotreros.length,
      page: 1,
      per_page: 10
    })
  }),

  http.get(`${API_BASE}/potreros/:id`, ({ params }) => {
    const id = Number(params.id)
    const potrero = mockPotreros.find(p => p.id === id) || mockPotreros[0]
    return HttpResponse.json({
      data: { ...potrero, id }
    })
  }),

  http.post(`${API_BASE}/potreros`, async ({ request }) => {
    const body = await request.json() as Partial<PotreroContract>
    if (!body.nombre || body.area === undefined) {
      return HttpResponse.json({
        errors: {
          nombre: !body.nombre ? 'Nombre es requerido' : undefined,
          area: body.area === undefined ? 'Área es requerida' : undefined,
        },
        message: 'Validación fallida'
      }, { status: 422 })
    }

    const newPotrero: PotreroContract = {
      id: Math.floor(Math.random() * 1000) + 10,
      nombre: body.nombre,
      area: Number(body.area),
      estado: body.estado || 'activo',
      created_at: new Date().toISOString()
    }
    return HttpResponse.json({ data: newPotrero }, { status: 201 })
  }),

  // --- CONTROLES ---
  http.get(`${API_BASE}/controles`, () => {
    return HttpResponse.json({
      data: mockControles,
      total: mockControles.length,
      page: 1,
      per_page: 10
    })
  }),

  http.get(`${API_BASE}/controles/:id`, ({ params }) => {
    const id = Number(params.id)
    const control = mockControles.find(c => c.id === id) || mockControles[0]
    return HttpResponse.json({
      data: { ...control, id }
    })
  }),

  http.post(`${API_BASE}/controles`, async ({ request }) => {
    const body = await request.json() as Partial<ControlContract>
    if (!body.animal_id || !body.fecha || !body.tipo) {
      return HttpResponse.json({
        errors: {
          animal_id: !body.animal_id ? 'ID de animal es requerido' : undefined,
          fecha: !body.fecha ? 'Fecha es requerida' : undefined,
          tipo: !body.tipo ? 'Tipo es requerido' : undefined,
        },
        message: 'Validación fallida'
      }, { status: 422 })
    }

    const newControl: ControlContract = {
      id: Math.floor(Math.random() * 1000) + 10,
      animal_id: Number(body.animal_id),
      fecha: body.fecha,
      tipo: body.tipo,
      diagnostico: body.diagnostico || 'Sano',
      observaciones: body.observaciones || '',
      created_at: new Date().toISOString()
    }
    return HttpResponse.json({ data: newControl }, { status: 201 })
  }),

  // --- REPORTE ICA ---
  http.get(`${API_BASE}/reportes/ica`, () => {
    return HttpResponse.json(mockIcaReport)
  }),

  // --- HEALTH / SYSTEM ---
  http.get(`${API_BASE}/v1/health`, () => {
    return HttpResponse.json({ status: 'healthy', version: '1.0.0' })
  }),
  
  // --- ANALYTICS ---
  http.get(`${API_BASE}/v1/analytics/dashboard/complete`, () => {
    return HttpResponse.json({
      total_animales: 100,
      animales_activos: 85,
      produccion_diaria: 1200
    })
  })
]
