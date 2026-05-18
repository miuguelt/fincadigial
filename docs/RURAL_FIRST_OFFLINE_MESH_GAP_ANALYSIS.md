# Diagnostico Rural-First, Offline y Mesh - Finca Villa Luz

Auditoria actualizada: 2026-05-06.

## Objetivo Producto

Convertir Villa Luz en una plataforma util para productores campesinos en territorios con baja conectividad: registrar trabajo diario, compartir informacion entre vecinos/nodos, mantener trazabilidad y sincronizar cuando aparezca internet, sin perder datos ni exigir conocimiento tecnico.

## Estado Actual Verificado

- La app ya tiene PWA, service worker, cache de GET, cola local de mutaciones y UI de sincronizacion mesh.
- `offlineQueue` guarda POST/PUT/PATCH/DELETE fallidos en IndexedDB y los reintenta cuando vuelve la red.
- `api` intercepta errores de red en mutaciones y responde `202 Accepted (Queued)` para no bloquear al usuario.
- `service-worker.js` cachea assets, API GET y envia mensajes a clientes cuando ocurre Background Sync.
- `ProximitySyncService` y `MeshMonitor` existen, pero la comunicacion real entre celulares todavia no es confiable ni completa.

## Veredicto Tecnico Sobre Mesh Actual

La intencion esta bien encaminada, pero el navegador impone limites fuertes:

- Web Bluetooth en navegador sirve para conectarse a perifericos BLE remotos y es experimental/de disponibilidad limitada; no convierte facilmente un celular web en servidor GATT para que otro navegador lo lea/escriba.
- `BroadcastChannel` solo comunica contextos de navegacion del mismo origen, como pestanas/iframes/workers; no descubre otros celulares en la misma vereda.
- WebRTC DataChannel necesita intercambio real de oferta/respuesta e ICE candidates. El codigo actual intenta senalizar con `BroadcastChannel`, por lo que funciona como prototipo local, no como red entre dispositivos independientes.
- Background Sync no esta disponible de forma uniforme en todos los navegadores; debe ser optimizacion, no unico mecanismo de entrega.
- El PIN `1234` y el intercambio de operaciones sin firma/cifrado no son suficientes para datos de fincas, ubicacion, salud animal o finanzas.

Referencias oficiales usadas: [MDN Web Bluetooth](https://developer.mozilla.org/docs/Web/API/Web_Bluetooth_API), [MDN Background Synchronization](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API), [MDN Broadcast Channel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API), [MDN WebRTC connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity), [Google Nearby Connections](https://developers.google.com/nearby/connections/overview), [Android Wi-Fi Aware](https://developer.android.com/develop/connectivity/wifi/wifi-aware?hl=en), [Apple Multipeer Connectivity](https://developer.apple.com/documentation/multipeerconnectivity).

## Arquitectura Recomendada

### Capa 1: PWA Offline-First

Mantener la PWA como entrada universal porque instala rapido y funciona en equipos modestos.

Debe cubrir:

- Lectura offline de catalogos maestros: especies, razas, medicamentos, vacunas, enfermedades, potreros, rutas de administracion.
- Escritura offline de operaciones diarias: animales, salud, reproduccion, produccion, inventario, tareas, notas de voz, fotos comprimidas.
- Modo campo: botones grandes, alto contraste, tolerancia a errores y textos simples.
- Sincronizacion oportunista cuando vuelve internet.

### Capa 2: App Nativa Ligera Para Transporte Local

Para compartir entre dispositivos sin internet de forma seria, conviene agregar una app contenedora o companion nativa:

- Android: Nearby Connections y/o Wi-Fi Aware para descubrimiento y transferencia P2P offline.
- iOS: Multipeer Connectivity para descubrimiento por Wi-Fi/Bluetooth local.
- Web: mantener QR/manual/WebRTC como fallback, no como transporte principal rural.

La PWA puede seguir siendo la UI; la capa nativa solo actua como modem local, copiando paquetes firmados del `sync_oplog`.

### Capa 3: Nodo Comunitario / Nodo Finca

Para territorios de dificil acceso, el mejor salto pragmatico es un nodo local:

- Un celular viejo, Raspberry Pi o mini PC crea Wi-Fi local sin internet.
- Corre un servicio LAN local: `http://villaluz.local` o IP fija.
- Recibe paquetes de varios celulares y los replica cuando alguien sube al casco urbano o aparece conectividad.
- Sirve como buzon comun: alertas sanitarias, compras comunitarias, precios, capacitaciones y mensajes.

### Capa 4: Sincronizacion Distribuida Real

Agregar un protocolo de datos independiente del transporte:

- `device_id`: identidad local persistente por equipo.
- `operation_id`: UUID por cambio, no timestamp random.
- `entity_type`, `entity_id`, `operation`, `payload`, `base_version`, `logical_clock`.
- `origin_device_id`, `author_user_id`, `finca_id`, `created_at_device`, `received_at`.
- Firma HMAC o Ed25519 por paquete.
- Cifrado de payload sensible por finca/nodo.
- Tombstones para deletes.
- Politicas de conflicto por entidad: last-write-wins solo donde sea seguro; merge por campo para notas/tareas; revision humana para salud, finanzas e inventario.

## Tablas Que Faltan Para Offline/Mesh

| Tabla propuesta | Proposito |
|---|---|
| `devices` | Registrar celulares/nodos autorizados por finca, nombre amigable, clave publica, ultimo contacto. |
| `sync_operations` | Oplog durable de cambios locales y recibidos por mesh. |
| `sync_sessions` | Historial de intercambios entre dispositivos/nodos. |
| `sync_operation_receipts` | Saber que peer ya recibio que operacion, evitando bucles. |
| `sync_conflicts` | Cola de conflictos para resolucion humana o automatica. |
| `node_messages` | Mensajeria persistente entre nodos, no solo estado React en memoria. |
| `attachment_blobs` | Fotos/audio/documentos con hashes, compresion y envio por partes. |
| `territories` | Vereda, municipio, departamento, zona, coordenadas y condiciones de conectividad. |
| `community_nodes` | Nodos comunitarios, escuelas, asociaciones, puntos de internet. |
| `offline_catalog_snapshots` | Versiones de catalogos para actualizar por paquetes. |

## Brechas Para Ser Util A Todo Campesino

Villa Luz hoy esta fuerte en ganaderia, salud animal, reproduccion, inventario, finanzas basicas y dashboard. Para servir a campesinos de distintos territorios falta ampliar dominios:

| Dominio faltante | Necesidad campesina |
|---|---|
| Cultivos | Lotes agricolas, siembra, fenologia, plagas, cosecha, rendimiento, semillas. |
| Clima y riesgos | Alertas offline de lluvia, heladas, sequia, incendios, derrumbes, crecientes. |
| Agua | Fuentes, riego, calidad de agua, turnos, tanques, bebederos, mantenimiento. |
| Comercializacion | Precios locales, pedidos, compradores, rutas, entregas, cartera. |
| Asociatividad | Cooperativas, mingas, bancos de herramientas, compras comunitarias. |
| Asistencia tecnica | Casos, visitas, recomendaciones, evidencias fotograficas, historial por finca. |
| Aprendizaje | Microlecciones offline, audio, pictogramas, dialectos/localismos. |
| Trazabilidad | Guias, certificados, vacunacion, lotes, origen-destino, documentos offline. |
| Inclusividad | Bajo alfabetismo digital, baja vision, una mano, sol fuerte, pantallas baratas. |
| Interoperabilidad | Exportar/importar paquetes por QR, archivo, USB, WhatsApp cuando haya senal. |

## Mejoras Concretas Al Codigo Actual

1. Reemplazar `BroadcastChannel` como descubrimiento entre dispositivos por una interfaz `TransportAdapter` con implementaciones: `NativeNearbyTransport`, `NativeMultipeerTransport`, `LanNodeTransport`, `QrFileTransport`, `WebRtcManualTransport`.
2. Corregir `offline-db.ts`: importa `idb`, pero `frontend/package.json` no declara la dependencia `idb`.
3. Hacer persistente la mensajeria mesh: `NodeCommunicationWidget` guarda mensajes solo en estado React.
4. Separar cache HTTP de cola operacional y adjuntos grandes; fotos/audio deben ir por chunks con hash.
5. Cambiar `device_id` de localStorage simple a identidad provisionada por finca, con recuperacion y revocacion.
6. Implementar compresion y prioridad: alertas sanitarias primero, luego texto, luego fotos/audio.
7. Implementar pruebas de simulacion: dos dispositivos, operaciones duplicadas, conflictos, reintentos, bateria baja y perdida de energia.
8. Agregar UI de confianza: quien envio, cuando, desde que nodo, si fue entregado o solo almacenado.

## Roadmap Pragmatico

### Fase 1: Estabilizar Offline Actual

- Alinear modelos/migraciones.
- Declarar `idb` o eliminar `offline-db.ts` si esta muerto.
- Crear `sync_operations` y mover `offlineQueue` a un oplog versionado.
- Pruebas E2E de crear/editar/borrar offline y sincronizar despues.

### Fase 2: Nodo Local

- Servicio LAN simple en backend o mini gateway.
- Descubrimiento por QR/IP local.
- Export/import de paquetes `.villaluzpack` para USB/WhatsApp/Bluetooth file share.
- Dashboard de nodo comunitario.

### Fase 3: Transporte Nativo

- Android companion con Nearby Connections.
- iOS companion con Multipeer Connectivity si el territorio exige iPhone/iPad.
- Bridge JS hacia la PWA mediante Capacitor o wrapper equivalente.

### Fase 4: Plataforma Campesina Territorial

- Modulos de cultivos, agua, mercado, asistencia tecnica y capacitacion.
- Catalogos territoriales offline.
- Red de nodos comunitarios con sincronizacion diferida.
- Gobernanza de datos: propiedad campesina, consentimiento y exportabilidad.

## Decision Tecnica Central

No apostaria el futuro rural de Villa Luz a Web Bluetooth puro. La PWA es excelente para UI y offline basico; la disponibilidad real en territorios dificiles necesita **oplog robusto + nodo local + transporte nativo opcional**. Ese trio es menos romantico que “mesh magico en navegador”, pero mucho mas probable que le funcione a un campesino bajo sol, con bateria baja y sin senal. Pequeño detalle, bastante importante.
