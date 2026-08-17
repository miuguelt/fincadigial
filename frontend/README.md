# VillaLuz Frontend

Aplicación React/TypeScript/Vite de VillaLuz. Este directorio es la única raíz frontend del proyecto.

## Runtime local

- Vite en `http://127.0.0.1:3005`.
- Proxy de desarrollo hacia el backend en `http://127.0.0.1:8092`.
- Arranque recomendado desde la raíz: `pwsh -File .\start-windows.ps1 -FrontendOnly`.
- Arranque directo: `npm run dev` desde `frontend/`.

Las variables de entorno del frontend son públicas por diseño; nunca poner secretos en `VITE_*`. Los valores de desarrollo y el proxy se mantienen en `vite.config.ts`.

## Feature-Sliced Design

```text
src/
  app/        providers, rutas y estilos globales
  pages/      vistas completas asociadas a rutas
  widgets/    bloques compuestos de interfaz
  features/   acciones y casos de uso del usuario
  entities/   modelos de dominio y UI simple
  shared/     API, tipos, utilidades y UI agnóstica
```

Regla de dependencias: `pages -> widgets -> features -> entities -> shared`. Las capas inferiores no importan capas superiores. Los servicios específicos de dominio deben vivir junto a su feature/entity o en `shared/api` solo si son realmente transversales.

## Calidad

Desde la raíz del repositorio:

```powershell
npm --prefix frontend run type-check
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

Los builds, cobertura, resultados de Playwright, logs y `node_modules` son generados y están excluidos de Git y del contexto de la IA. No crear archivos sueltos en `frontend/`; los scripts duraderos deben ir a `frontend/scripts/` y la documentación a `docs/`.
