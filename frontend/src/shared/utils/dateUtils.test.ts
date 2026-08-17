import { describe, it, expect, vi } from 'vitest'
import { getTodayColombia, formatDateColombia, calculateAge } from './dateUtils'

describe('dateUtils', () => {
  describe('getTodayColombia', () => {
    it('debe retornar la fecha actual en formato YYYY-MM-DD', () => {
      const today = getTodayColombia()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('formatDateColombia', () => {
    it('debe formatear correctamente una instancia de Date', () => {
      const date = new Date('2023-01-15T12:00:00Z')
      const formatted = formatDateColombia(date)
      // Nota: Dependiendo de la zona horaria del sistema de ejecución, esto podría variar si no se mockea el tiempo
      // pero el formato debe ser consistente.
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('calculateAge', () => {
    it('debe calcular la edad correctamente para una fecha pasada', () => {
      // Mockeamos la fecha actual para que el test sea determinista
      vi.setSystemTime(new Date('2026-05-16'))

      const birthDate = '2023-05-16'
      const age = calculateAge(birthDate)
      expect(age).toBe('3 años')

      const birthDate2 = '2023-02-16'
      const age2 = calculateAge(birthDate2)
      expect(age2).toBe('3 años, 3 meses')

      vi.useRealTimers()
    })

    it('debe retornar string vacío si no hay fecha', () => {
      expect(calculateAge('')).toBe('')
    })
  })
})
