# Procedimiento de alta de VillaLuz para SENA

## Fase 0 — No contacto con datos reales

Usar únicamente datos sintéticos. No usar cédulas, correos, teléfonos, aprendices, instructores, animales, fincas, archivos o marcas reales del SENA.

## Fase 1 — Descubrimiento institucional

1. Conseguir patrocinador y dependencia dueña del proceso.
2. Definir población, finalidades y sistemas involucrados.
3. Confirmar si el proyecto es piloto, contratación, convenio, transferencia tecnológica o integración.
4. Clasificar los datos y determinar si hay menores, datos sensibles, ubicación o información reservada.

Salida: acta de alcance y matriz de tratamiento aprobada.

## Fase 2 — Jurídica y contractual

1. Definir SENA como responsable y proveedor como encargado, si corresponde.
2. Incorporar el anexo contractual de datos, seguridad, software y salida.
3. Obtener autorización de marca, integración y publicación.
4. Definir tratamiento de menores y comunicaciones opcionales.

Salida: contrato/convenio y concepto jurídico.

## Fase 3 — Seguridad, privacidad y archivo

1. Aprobar arquitectura y ubicación de datos.
2. Ejecutar threat modeling, SAST, DAST, escaneo de dependencias e imágenes.
3. Probar aislamiento entre fincas, control de roles, backups y restauración.
4. Auditar WCAG 2.1 AA.
5. Asociar datos y documentos a retención y archivo institucional.
6. Ejecutar simulacro de incidente y solicitud de titular.

Salida: paquete de evidencias y acta de seguridad/privacidad.

## Fase 4 — Piloto controlado

1. Usar población autorizada y datos mínimos.
2. Mantener monitoreo y soporte.
3. Revisar incidentes, quejas, accesibilidad y desempeño.
4. Prohibir exportaciones informales y copias locales.

Salida: acta UAT y recomendación de paso a producción.

## Fase 5 — Producción

Solo se habilita cuando `npm run legal:release` termina sin bloqueadores y el SENA firma el acta de aceptación. La aplicación debe usar el manifiesto institucional aprobado, dominio autorizado, proveedor autorizado y canales oficiales de soporte.

