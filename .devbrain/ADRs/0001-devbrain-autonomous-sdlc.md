# ADR 0001: Implementación del Ciclo de Vida del Software (SDLC) Autónomo para DevBrain

**Fecha:** 2026-06-08
**Estado:** Aprobado

## Contexto
A medida que *Villaluz* escala y el proyecto añade nuevos módulos (Finanzas, IA Predictiva, Sanidad Animal), el riesgo de introducir *bugs* mediante asistencia IA o automatizaciones también aumenta. Se requería un mecanismo sistemático que permitiera al sistema (especialmente a DevBrain) escalar e inyectar nuevo código sin provocar regresiones o fallas silenciosas en la base de datos o el frontend.

## Decisión
Se establece oficialmente el **Estándar de Desarrollo Autónomo DevBrain**.
Este estándar fuerza al agente de IA a operar bajo un paradigma "Planner-Worker" y una arquitectura "Zero-Breakage" (Append-only).

### Reglas Clave:
1. **Planner First:** Ningún cambio masivo de código debe ejecutarse sin antes revisar `ARCHITECTURE.md`, generar un `implementation_plan.md` y recibir aprobación humana explícita.
2. **SSoT (Single Source of Truth) para CRUDs:** Prohibido el mocking (datos falsos hardcodeados). DevBrain debe crear la estructura en DB, luego el Endpoint en Flask y finalmente el Hook + Types en Frontend.
3. **Auditoría Contínua:** Ningún flujo se da por terminado sin ejecutar `npm run type-check` (Frontend) o el suite de tests correspondientes (Backend).

## Consecuencias
- **Positivas:** Los futuros desarrollos son predecibles. El código generado por IA mantiene la convención de `Feature-Sliced Design` (FSD). Se anula la "alucinación" de UI falsa al estar forzosamente ligada a la BD real.
- **Negativas / Costo:** Cada iteración requerirá más turnos (planeación + validación), priorizando calidad y estabilidad por encima de velocidad irresponsable.
