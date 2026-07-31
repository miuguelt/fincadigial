# Chat rural con nodo local

## Estrategia operativa

Villa Luz usa tres niveles de entrega, en este orden:

1. Servidor principal cuando existe internet estable.
2. Nodo Villa Luz dentro de la red Wi-Fi o hotspot de la finca.
3. Bandeja local persistente cuando ninguno de los dos está disponible.

El tercer nivel conserva el mensaje como **pendiente** y lo reintenta al recuperar una ruta. Los contactos y los últimos 500 mensajes de texto quedan disponibles en el dispositivo.

Un navegador de celular no puede aceptar conexiones entrantes como servidor. Por eso el nodo real debe ser un portátil, mini-PC, Raspberry Pi o contenedor nativo que ejecute Villa Luz. Bluetooth/WebRTC del navegador no se considera el transporte principal: no ofrece descubrimiento ni entrega confiable entre teléfonos sin señalización.

## Puesta en campo

1. En el equipo que actuará como nodo, conectarse al router o activar un hotspot.
2. Ejecutar `DEVBRAIN START` o `./start-windows.ps1`.
3. Leer en la consola la línea `Nodo campo: http://IP:3005`.
4. Conectar los demás equipos a la misma red y abrir esa dirección.
5. Instalar la PWA desde el navegador de cada equipo.
6. Abrir **Mensajes**. El botón **Nodo** permite probar una API de nodo alternativa si la PWA se abrió desde otro servidor.

Cuando los teléfonos abren Villa Luz directamente desde `http://IP:3005`, no necesitan configurar una dirección alternativa: el frontend usa `/api/v1` y el proxy del nodo entrega las peticiones al backend local.

## Requisitos de red

- El nodo escucha en todas las interfaces de red en los puertos `3005` (web) y `8092` (API).
- Windows Firewall debe permitir Node/Vite en red privada. Para el flujo recomendado basta permitir el puerto `3005`; la API viaja por el proxy del mismo origen.
- Todos los usuarios deben pertenecer a la misma finca y autenticarse antes de perder conectividad. El token nunca se envía por HTTP a una dirección pública; la configuración solo acepta HTTP para IP privadas, localhost o `.local`.
- Los adjuntos continúan requiriendo conexión. El modo rural garantizado cubre texto; fotos y archivos necesitan una futura cola por bloques con hash.

## Prueba de aceptación en sitio

1. Equipo A y B conectados al hotspot del nodo, sin salida a internet.
2. Ambos abren la URL `http://IP:3005` e inician sesión.
3. A envía texto a B: debe aparecer como entregado, no como pendiente.
4. B abre la conversación y confirma el historial.
5. Se apaga el nodo; A envía otro texto: debe mostrarse `pendiente`.
6. Se enciende el nodo: al abrir el chat o recuperar la red, el mensaje pendiente debe entregarse y persistir después de recargar.

## Siguiente evolución

Para convertir teléfonos Android en nodos sin portátil se necesita una capa nativa (Nearby Connections/Wi-Fi Aware) o un contenedor Capacitor con servicio local. La PWA actual ya separa la bandeja offline del transporte y puede reutilizar ese puente, pero no simula capacidades que el navegador no posee.
