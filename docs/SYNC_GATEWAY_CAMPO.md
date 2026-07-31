# Sincronización de campo Villa Luz

## Comportamiento

Cada dispositivo escribe primero en su cola local (`IndexedDB`). El ciclo de
puerta de enlace se ejecuta al iniciar sesión, al volver la conectividad y cada
20 segundos mientras la app está visible:

1. intenta aplicar las operaciones al API;
2. si no hay salida a internet, usa el nodo Villa Luz de la red local;
3. publica el registro de operaciones en `/sync/push` y recupera lo que otros
   dispositivos dejaron en `/sync/pull`;
4. conserva el cursor por finca y dispositivo para no saltarse datos;
5. reintenta las operaciones recibidas usando su ruta HTTP original.

La cola no caduca por número de intentos: usa backoff progresivo de hasta 15
minutos y conserva la operación hasta recibir confirmación. El navegador solicita
almacenamiento persistente y permite usar catálogos vencidos mientras continúa
sin señal, por lo que una jornada de varios días no borra el trabajo local.

El chat usa el mismo principio: el outbox local es la fuente de entrega. La
proximidad sólo sirve para descubrir personas; no se considera entrega final un
mensaje que únicamente haya pasado por `BroadcastChannel`.

## Puesta en marcha en una finca

1. Ejecutar `.\start-windows.ps1` en el equipo que tenga la base de datos y el
   backend.
2. Conectar los teléfonos al mismo Wi‑Fi o al hotspot del equipo.
3. Abrir en todos los teléfonos la URL `Nodo campo: http://IP:3005` que imprime
   el script y autenticarse normalmente.
4. Dejar al menos un equipo con internet. La cola se vacía automáticamente en
   cuanto ese equipo tenga ruta; los demás pueden seguir capturando datos sin
   cobertura.

El backend exige JWT en las rutas de sincronización. Los transportes LAN y la
señalización WebRTC envían el token de la sesión, por lo que un `401` no se
interpreta como nodo disponible.

## Límites reales

Un navegador no puede escuchar conexiones entrantes ni funcionar como servidor
HTTP por sí solo. Por eso el nodo recomendado es el equipo que ejecuta Villa
Luz (portátil, Raspberry Pi o teléfono Android con Termux), y los celulares son
clientes que comparten la cola con ese nodo. Bluetooth/WebRTC queda como
transporte auxiliar y no reemplaza al nodo persistente.
