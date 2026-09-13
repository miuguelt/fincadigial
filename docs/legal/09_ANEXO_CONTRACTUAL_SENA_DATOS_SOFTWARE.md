# Borrador de anexo contractual SENA: datos, software y seguridad

Este documento es un borrador técnico para revisión de Jurídica, Contratación, Oficina de Sistemas, Seguridad de la Información y Gestión Documental del SENA. No es un contrato válido hasta que sea incorporado y firmado por las partes competentes.

## 1. Identificación

- Entidad responsable: Servicio Nacional de Aprendizaje — SENA.
- NIT: 899.999.034-1, sujeto a verificación en el expediente contractual.
- Contratista/encargado: `<RAZÓN_SOCIAL_PROVEEDOR>`.
- Contrato/convenio: `<NÚMERO_Y_FECHA>`.
- Dependencia dueña del proceso: `<DEPENDENCIA>`.
- Sistemas y ambientes autorizados: `<LISTA>`.

## 2. Instrucciones de tratamiento

El encargado tratará datos únicamente por cuenta del SENA, conforme a las finalidades, categorías, usuarios autorizados, ambiente, ubicación y tiempo definidos en el contrato y en la matriz de tratamiento. No podrá vender, perfilar, entrenar modelos, reutilizar, combinar ni divulgar los datos para fines propios.

## 3. Seguridad mínima

El encargado debe implementar control de acceso por necesidad, autenticación robusta, separación de tenants, cifrado en tránsito y en reposo cuando corresponda, gestión de secretos, logs protegidos, URLs privadas, backups cifrados, pruebas de restauración, escaneo de dependencias e imágenes, gestión de vulnerabilidades y eliminación segura de ambientes de prueba.

## 4. Incidentes y auditoría

El encargado notificará al SENA sin demora injustificada según el SLA contractual, preservará evidencia, cooperará con la investigación y no comunicará públicamente un incidente que involucre información del SENA sin autorización institucional, salvo obligación legal.

El SENA podrá solicitar evidencias, pruebas, registros, informes de vulnerabilidades, subcontratos, ubicación de datos y certificaciones razonables.

## 5. Subencargados y nube

Todo subencargado requiere autorización previa. El encargado debe informar proveedor, país, función, categorías de datos, acceso, medidas de seguridad y mecanismo aplicable a transferencias o transmisiones internacionales.

El uso de Coolify, VPS, correo, almacenamiento, observabilidad o servicios de terceros debe quedar expresamente autorizado. El proveedor debe garantizar reversibilidad y exportación de datos en formato utilizable.

## 6. Retorno, eliminación y archivo

Al finalizar, el encargado devolverá los datos y evidencias en el formato acordado, eliminará copias no sujetas a conservación y entregará certificación. La eliminación estará subordinada a las obligaciones legales y archivísticas del SENA; no se destruirán documentos institucionales sin instrucción formal.

## 7. Software y propiedad intelectual

El contrato debe definir código fuente, documentación, configuraciones, diseños, componentes preexistentes, componentes open source, licencias, derechos de uso, garantías, mantenimiento, vulnerabilidades y entrega al SENA. El proveedor debe entregar SBOM y relación de licencias.

## 8. Aceptación

La puesta en producción requiere acta de aceptación funcional, seguridad, privacidad, accesibilidad, continuidad, archivo y licenciamiento, firmada por los responsables designados por el SENA.

