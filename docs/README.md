# Documentación VillaLuz

Este directorio contiene documentación del sistema. La información operativa vigente debe ser breve, referenciable y no duplicar secretos ni logs.

## Puntos de entrada

- [Arquitectura](../ARCHITECTURE.md): límites de backend/frontend y flujo de capas.
- [Contexto para IA](../.devbrain/context/project-context.yml): ficha compacta para ahorrar tokens.
- [Higiene del proyecto](architecture/PROJECT_HYGIENE.md): reglas para mantener el repositorio limpio y escalable.
- [Secretos e ignores](architecture/SECURITY_AND_IGNORE_STRATEGY.md): credenciales, gates y contextos `.gitignore`/`.dockerignore`.
- [Excepciones de modularidad](architecture/exceptions.md): deuda técnica conocida y acotada.
- [Arranque](ARRANQUE.md): instrucciones operativas existentes.

## Organización

- `architecture/`: decisiones, límites y reglas estructurales.
- `onboarding/`: guías para incorporar desarrolladores.
- `design/`: criterios de UI y experiencia.
- Raíz de `docs/`: informes, análisis y documentación histórica aún en proceso de clasificación.

Los informes fechados son evidencia histórica, no sustituyen al runtime ni a las reglas canónicas. Si una guía antigua contradice `start-windows.ps1`, `backend/config.py`, `frontend/vite.config.ts` o el contexto de `.devbrain`, se debe corregir o marcar como histórica antes de reutilizarla.
