# Lista de salida para Coolify, Docker y VPS

## Antes de publicar

- [ ] Dominio y certificado TLS válidos.
- [ ] Solo 80/443 publicados; SSH restringido por red, llave y MFA cuando sea posible.
- [ ] PostgreSQL, Redis, panel de administración y almacenamiento sin exposición pública.
- [ ] Secretos configurados en Coolify; no están en la imagen, repositorio, registros ni argumentos.
- [ ] `SENA_INSTITUTIONAL_MODE=provisional_not_authorized` y `LEGAL_RELEASE_APPROVED=false` mientras falte aprobación institucional; solo cambiar después de cerrar la matriz SENA.
- [ ] `FLASK_SECRET_KEY`, JWT y credenciales de base/administrador son únicos por ambiente y fueron rotados.
- [ ] CORS permite solo los orígenes necesarios.
- [ ] Cookies `Secure`, `HttpOnly`, `SameSite` y protección CSRF según el flujo.
- [ ] Para el frontend institucional: `VITE_USE_BEARER_AUTH=false` y `AUTH_COOKIE_ONLY=true`; no se almacenan JWT en `localStorage` ni `sessionStorage`.
- [ ] Mantener `DATA_COLLECTION_ENABLED=false` y `PUBLIC_USER_CREATION_ENABLED=false` mientras el despliegue sea provisional; cambiar a `true` solo con acta de liberación operativa.
- [ ] `JWT_COOKIE_SECURE=true`, `JWT_COOKIE_CSRF_PROTECT=true` y dominio/origen de cookies verificados con HTTPS real.
- [ ] Límites de tamaño, tipo y cantidad para archivos; antivirus o análisis de contenido cuando corresponda.
- [ ] Rutas públicas de archivos revisadas y cerradas si contienen datos personales.
- [ ] Encabezados de seguridad, política de contenido y registro de accesos administrativos.
- [ ] Contenedores ejecutan con usuario no root cuando sea viable, filesystem de solo lectura cuando sea viable y sin privilegios innecesarios.
- [ ] Imágenes y dependencias escaneadas; parches aplicados.
- [ ] Red privada, mínimo privilegio y conexiones cifradas a servicios.

## Continuidad

- [ ] Copia de base de datos cifrada fuera del VPS.
- [ ] Copia de archivos cifrada fuera del VPS.
- [ ] Retención definida y borrado seguro.
- [ ] Prueba documentada de restauración.
- [ ] RPO/RTO aprobados.
- [ ] Monitoreo de espacio, CPU, memoria, errores, intentos de acceso y vencimiento del certificado.
- [ ] Procedimiento para revocar credenciales y aislar el servicio.

## Aprobación

La casilla “publicado” solo puede marcarse cuando el responsable del tratamiento y el responsable técnico firmen el acta de liberación y el control de cumplimiento no tenga bloqueadores.
