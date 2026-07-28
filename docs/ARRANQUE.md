# Estrategia de arranque — Villaluz (Windows nativo)

Objetivo: dejar de pelear con el arranque. Un solo comando, un solo veredicto, y un
árbol de diagnóstico corto cuando falla.

## 1. El comando único

```bash
powershell -File C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\start-windows.ps1 -Daemon
```

Se puede invocar **desde cualquier directorio**. Termina con:

- `exit 0` + `DAEMON_OK:PM2` → backend responde `/api/v1/health` y frontend acepta TCP. Operativo de verdad.
- `exit 1` → NO operativo, con el motivo impreso. Nunca reporta éxito sin verificar.

Nada más debe usarse para arrancar. En particular, no lanzar `pm2 start`, `flask run`,
`npm run dev` ni `celery` a mano: cada proceso suelto queda fuera del lifecycle y del
`-Stop`, y es la fuente típica de "puerto ocupado" al siguiente arranque.

## 2. Los otros dos comandos

| Acción | Comando |
|---|---|
| Ver estado | `start-windows.ps1 -Status` |
| Detener todo | `start-windows.ps1 -Stop` (pide elevación para limpiar procesos huérfanos) |

Variantes: `-BackendOnly`, `-FrontendOnly`, `-MonitorLogs` (abre `pm2 logs` en vivo).

## 3. Invariantes que el script ya garantiza

No hay que verificarlos a mano; el script los resuelve o falla con mensaje claro.

1. **Puertos desde el registro central.** `Get-Port` lee
   `_infrastructure/devbraind/mcp/config/port-registry.json`. Canónicos: backend 8092,
   frontend 3005, PostgreSQL 5434, Redis/Memurai **6380** (nunca 6379).
2. **Dependencias arriba antes de los procesos.** Arranca el servicio nativo de
   PostgreSQL y Memurai si están caídos. Si Redis no sube, arranca sin Celery/Beat en
   lugar de morir.
3. **PM2 aislado.** `PM2_HOME=logs\pm2`. No comparte daemon con otros proyectos.
   `pm2 ping` con reintentos antes de `startOrReload`, y `startOrReload` reintenta 3 veces.
4. **Config por ruta absoluta.** `ecosystem.config.cjs` se pasa absoluto (ver §5).
5. **Verificación post-arranque.** `Wait-VillaluzReady`: hasta 90 s sondeando
   `/api/v1/health` y el puerto del frontend antes de declarar éxito.

## 4. Si falla: árbol de diagnóstico (en orden, párese al primer hallazgo)

```bash
powershell -File .\start-windows.ps1 -Status
```

1. **DB o Redis OFFLINE** → problema de servicio Windows, no de Villaluz:
   `Get-Service Memurai, postgresql-x64-18`. Arránquelos y reintente.
2. **Backend/Frontend OFFLINE pero el script dijo `exit 0`** → imposible por diseño
   desde §3.5; si ocurre, es un bug del gate de verificación.
3. **El script falló** → el mensaje ya dice en qué etapa. Para el detalle:
   ```bash
   npx pm2 logs --lines 50
   ```
   con `PM2_HOME` apuntando a `logs\pm2`.
4. **Un proceso en `errored` o con `↺` creciendo** → `npx pm2 describe <app>` y el log
   de error correspondiente en `logs\pm2\logs\`.

## 5. Trampas conocidas (ya mordieron, no vuelvan a morder)

- **`ecosystem.config.cjs` no está versionado.** Es por máquina. Un clon nuevo o un
  **git worktree no lo tiene**. El script ahora falla explícito
  (`no existe ...ecosystem.config.cjs`) en vez de dar un error críptico de PM2.
- **`[PM2][ERROR] File ecosystem.config.cjs not found`** era el fallo real de arranque:
  la config se pasaba relativa y PM2 la resolvía contra el cwd del invocador. Corregido
  con ruta absoluta. Si vuelve a aparecer, es que alguien reintrodujo la ruta relativa.
- **Los worktrees en `.claude/worktrees/` no arrancan la app.** El runtime siempre es el
  árbol principal `_projects/villaluz`. Editar el worktree no cambia lo que corre.
- **Ruido en los logs que NO es causa de arranque:** `redis.exceptions.TimeoutError:
  Timeout reading from socket` y `ConnectionError: Connection closed by server` son
  reconexiones históricas del EventBus/Celery, acumuladas en logs que nunca se rotan.
  No los persiga sin antes comparar la **fecha** con la del intento actual.
- **El dashboard DevBrain reporta "start finalizó con éxito" por código de salida del
  comando.** Con el gate de §3.5 ese código ya es fiable; antes no lo era.

## 6. Regla de oro para diagnosticar

Antes de leer un traceback, compare su timestamp con la hora actual. La mayoría del
tiempo perdido en este proyecto fue depurar errores de días anteriores.
