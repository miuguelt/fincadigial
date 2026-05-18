# Estrategia de Control de Puertos en Windows (DevBrain)

Este documento detalla por qué ocurren los cruces de puertos y cómo implementar una estrategia de "Puerto Determinista" para evitar conflictos entre proyectos.

## 1. ¿Por qué ocurre esto?

1.  **Procesos Zombie (La Causa #1):** Al cerrar terminales o fallar un proceso de `npm`, el proceso hijo `node.exe` no siempre se cierra. Se queda "huérfano", manteniendo el socket (puerto) abierto.
2.  **Reservas Dinámicas de Hyper-V/WSL:** Windows reserva bloques de puertos para servicios internos de virtualización. Estos bloques pueden cambiar en cada reinicio, chocando con puertos comunes (3000, 5000, 8080).
3.  **Rango de Puertos Efímeros:** Windows asigna puertos dinámicos para conexiones salientes. Si un puerto de desarrollo cae en este rango, otra app podría "robárselo" accidentalmente.

---

## 2. Estrategia de Mitigación (Nivel Windows)

### A. Reserva Permanente (Exclusión de Netsh)
Para evitar que Windows o Hyper-V tomen tus puertos, debemos reservarlos formalmente en el stack TCP/IP.

**Comando Sugerido (Ejecutar como Admin):**
```powershell
# Reservar el rango 3000-3010 para desarrollo manual
netsh int ipv4 add excludedportrange protocol=tcp startport=3000 numberofports=11
```
*Nota: Esto impide que CUALQUIER otra app use estos puertos dinámicamente.*

### B. Mapeo Determinista por Proyecto
Evitar el uso de puertos por defecto (3000, 5173). Asignar rangos específicos por "Familia de Proyecto" en el archivo `hosts` o un registro interno.

| Proyecto   | Rango Puertos | Ejemplo |
| :--------- | :------------ | :------ |
| **Villaluz** | 3000 - 3009   | Frontend: 3005, Backend: 8092 |
| **Sennova**  | 3100 - 3109   | Frontend: 3105 |
| **CGAO**     | 3200 - 3209   | Frontend: 3205 |

### C. Limpieza Agresiva (Pre-Flight Check)
No confiar en que el puerto está libre. El `predev` debe forzar el cierre de cualquier ocupante previo que no sea un servicio crítico.

---

## 3. Implementación Sugerida: Script de Registro

Crearemos un script centralizador para "blindar" los puertos del proyecto actual en `scripts/RESERVE_PORTS.ps1`.

---

## 4. Mejora en el Guardian (DevBrain Guardian)

El `DEVBRAIN_GUARDIAN.ps1` ya ha sido corregido para ser más efectivo detectando procesos `node` huérfanos. Se recomienda mantener siempre el flag `-Repair` en el `package.json`.

> [!TIP]
> Si experimentas un "Access Denied" persistente incluso tras cerrar todo, ejecuta:
> `netsh int ipv4 show excludedportrange protocol=tcp`
> Si tu puerto aparece en la lista con un asterisco (*), Hyper-V lo ha bloqueado. La solución es reservar tu rango de puertos manualmente antes de que Hyper-V inicie.
