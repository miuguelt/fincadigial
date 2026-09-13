# Identidad y transferencia consentida de animales

## Flujo operativo

1. La finca origen registra la venta desde **Registrar salida → Venta comercial**.
   El animal queda `Vendido` en esa finca y el API entrega una sola vez un código
   privado `VL-...`. Solo se guarda el hash del código.
2. La finca destino registra el animal con registro, fecha de nacimiento, sexo,
   raza y, si están disponibles, NFC/arete electrónico. Puede introducir el
   código privado o marcar **Buscar una venta coincidente**.
3. El sistema compara los atributos estables y crea una solicitud pendiente; no
   crea un duplicado ni mueve el animal todavía.
4. El propietario original recibe la solicitud en el feed de notificaciones (y
   por push/SSE si está disponible). **Aceptar y compartir historial** mueve la
   misma fila `animals` a la finca destino y conserva tratamientos, vacunaciones,
   controles, enfermedades, reproducción y movimientos. **Rechazar** deja el
   animal vendido en el origen.

## API

- `POST /api/v1/animals/transfers/sell`
- `POST /api/v1/animals/transfers/register`
- `GET /api/v1/animals/transfers/claims`
- `POST /api/v1/animals/transfers/claims/{id}/decision`
- `GET /api/v1/animals/transfers/{animal_id}/portable-history`
- `PATCH /api/v1/notifications/{notification_id}` con `approve` o `reject`;
  las solicitudes de animales usan un ID negativo para no colisionar con las
  solicitudes de membresía existentes.

## Identificación oficial y crías

Cada alta crea una fila `animal_identities` y expone `animal_uid` (código oficial
si existe o QR local). Un código ICA/SINIGAN enviado por el usuario se guarda como
`UNVERIFIED`/`PENDING_ICA_VERIFICATION`; nunca se presenta como verificado sin una
respuesta de la autoridad. La integración del conector oficial queda aislada en
esta tabla para incorporarla cuando exista el acceso/API correspondiente.

Las crías registradas desde un parto se marcan `BORN_ON_FARM` y reciben un plazo
operativo configurable mediante `ANIMAL_PROVISIONAL_DAYS` (365 por defecto). El
valor es una configuración de operación, no una afirmación del plazo legal; debe
ajustarse al cronograma ICA vigente.

## Controles de seguridad

- membresía activa y rol por finca en cada operación;
- autorización exclusiva del vendedor o propietario/administrador de la finca
  origen para decidir;
- código privado almacenado como SHA-256, nunca en base de datos;
- bloqueo de filas para evitar dos decisiones concurrentes;
- expiración automática de solicitudes abiertas (30 días, máximo 90);
- historial portátil limitado a datos sanitarios y de trazabilidad, sin precios ni
  información financiera del vendedor;
- el movimiento conserva la identidad primaria del animal y registra auditoría.
