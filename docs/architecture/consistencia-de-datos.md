# Consistencia de datos en cliente

## Decisión

Una escritura confirmada debe invalidar todas las representaciones locales del
dato antes de que las vistas vuelvan a consultar:

1. El interceptor común de `api` detecta `POST`, `PUT`, `PATCH` y `DELETE`.
2. Se limpia el caché HTTP en memoria e IndexedDB y se emite
   `server-resource-changed` con `force: true`.
3. `GlobalNetworkHandlers` agrupa eventos cercanos y actualiza en paralelo
   React Query y el registro de `useResource`.
4. Las vistas con cachés propios (precarga, analíticas y actividad) invalidan
   también su snapshot local.

Las operaciones offline no emiten un refresco por haber sido encoladas. Lo
emiten al confirmarse en el servidor o en el nodo rural, para que una vista no
presente como definitivo un dato que aún está pendiente.

## Contrato de eventos

- `crud:refetch`: compatibilidad con pantallas CRUD existentes.
- `server-resource-changed`: sincroniza consultas, estadísticas y vistas
  derivadas. `endpoint` puede ser la ruta completa o el slug del recurso.
- Los eventos locales incluyen `local: true`; los eventos SSE sin endpoint
  (por ejemplo chat) no invalidan toda la aplicación.

## Política de montaje

Las consultas React Query usan `refetchOnMount: true`, de modo que una
consulta invalidada vuelve a solicitar datos al regresar a una pantalla,
incluidas las que estaban desmontadas al momento de la escritura.
