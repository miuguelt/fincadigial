# Estrategia de Pruebas y Calidad Continua - Villa Luz

Este documento define el protocolo de pruebas para asegurar la estabilidad, el rendimiento y la integridad de los datos en la plataforma Villa Luz, especialmente en condiciones de conectividad rural.

## 🏗️ Niveles de Prueba

### 1. Pruebas Unitarias (Lógica Atómica)
*   **Herramienta:** Jest / Vitest.
*   **Frecuencia:** Al finalizar cada función pura o servicio de cálculo.
*   **Objetivo:** Validar algoritmos de salud, cálculos de peso, lógica del protocolo Mesh (VLMSP) e integraciones de persistencia.
*   **Mandato:** Cobertura > 80% en archivos de la carpeta `shared/utils` y `shared/api`.

### 2. Pruebas de Componentes (UI/UX)
*   **Herramienta:** React Testing Library + MSW (Mock Service Worker).
*   **Frecuencia:** Al finalizar un nuevo widget o componente compartido (`shared/ui`).
*   **Objetivo:** Asegurar que los componentes reaccionen correctamente a estados de carga, error y datos vacíos sin romper la interfaz.
*   **Mandato:** Todo componente en `shared/ui` debe tener un archivo `.test.tsx`.

### 3. Pruebas de Integración y Flujo (E2E)
*   **Herramienta:** Playwright.
*   **Frecuencia:** Al finalizar cada "Feature" completa y antes de cada despliegue a producción.
*   **Objetivo:** Validar los "Caminos Críticos":
    *   Login y persistencia de sesión.
    *   Creación de registro animal con sincronización offline.
    *   Traslado de lotes entre potreros.
    *   Sincronización Mesh entre dos dispositivos simulados.
*   **Mandato:** Los flujos críticos deben ser "Zero-Fault" (cero errores en consola durante el flujo).

### 4. Pruebas de Estrés y Resiliencia
*   **Herramienta:** Scripts personalizados de Node.js (como `api-stress-test.cjs`).
*   **Frecuencia:** Al final de cada hito (milestone) del proyecto.
*   **Objetivo:** Validar el comportamiento del sistema bajo carga y en condiciones de red inestable (simulando 3G/2G).

---

## 🛠️ Proceso de Solución de Errores (Fix Protocol)

Cuando una prueba falla o se detecta un error de ejecución, se debe seguir este flujo:

1.  **Aislamiento**: Ejecutar la prueba específica (`npm test <path>`) para confirmar el fallo sin ruido.
2.  **Diagnóstico de Logs**: Revisar `/maintenance/logs` y la consola del navegador para identificar si es un error de tipos, de red (500) o de lógica.
3.  **Auditoría de Regresión**: Verificar si el cambio rompió dependencias transversales usando `npm run type-check`.
4.  **Corrección Atómica**: Aplicar la solución mínima necesaria. No "tumbar la casa para poner un ladrillo".
5.  **Verificación Cruzada**: Re-ejecutar pruebas unitarias y E2E relacionadas.

## ⚖️ Regla de Funcionalidad Total (Mandato de Entrega)

**"Nada se entrega si no es plenamente funcional."**
*   **Vistas**: Cada vista debe cargar en < 1s y no mostrar skeletons infinitos.
*   **Formularios**: Cada campo debe tener validación (Zod) y feedback visual claro. El botón de "Enviar" debe estar deshabilitado durante la carga.
*   **Consola Limpia**: Cero errores de `key`, `unique ID` o `hydration`.

## 🗺️ Orden Estratégico de Pruebas (Test Mapping)

Para validar un cambio masivo, seguir este orden de inspección:
1.  **Auth Layer**: Validar que la sesión persiste y `/auth/me` responde.
2.  **Persistencia Local**: Validar que `IndexedDB` tiene los datos sincronizados.
3.  **Core Dashboard**: Validar que los KPIs cargan y no hay lag al navegar.
4.  **Workflows de Campo**:
    *   Formulario de Traslado (BatchFieldTransfer).
    *   Registro de Sanidad (Vacunas/Controles).
    *   Sincronización P2P (Mesh).
5.  **Analytics**: Vistas de mapas y gráficas de tendencia.

---

## 📝 Check-list de Cierre (Final de Función/Feature)
- [ ] ¿La función tiene manejo de errores (`try-catch`) con logging?
- [ ] ¿Se han evitado re-renders innecesarios (`useMemo`/`useCallback`)?
- [ ] ¿El componente es accesible (ARIA) y responsive?
- [ ] ¿Se han ejecutado las pruebas unitarias locales (`npm test <archivo>`)?

## 🏆 Check-list de Cierre de Proyecto
- [ ] **Auditoría de Bundles**: Verificar que ningún chunk supere los 500KB gzipped.
- [ ] **E2E Smoke Test**: Ejecución exitosa de `npm run test:e2e` en todos los navegadores.
- [ ] **Persistencia Offline**: Validar que los datos se recuperan tras un reinicio del navegador sin conexión.
- [ ] **Seguridad**: Validar que no hay tokens expuestos en logs o localStorage (usar cookies HttpOnly).
