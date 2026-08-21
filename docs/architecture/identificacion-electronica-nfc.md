# Identificación electrónica del animal (NFC y transpondedor LF)

**Estado:** implementado · **Fecha:** 2026-08-19 · **Alcance:** `frontend/src/features/nfc-tagging`, `backend/app/services/nfc`, `backend/app/namespaces/animals/animal_nfc_namespace.py`, `backend/app/models/electronic_id_mixin.py`

## El problema real

Un arete impreso con código QR se lee bien el primer mes. Después el barro, el
sol y el roce lo dejan ilegible justo cuando más se necesita: en la manga, con
el animal inquieto y el operario con las manos ocupadas. El chip resuelve eso,
pero no todos los chips que se usan en ganadería son lo mismo, y la diferencia
decide qué puede hacer la aplicación.

## Restricción que define el diseño: son dos frecuencias distintas

| | Arete NFC | Bolo ruminal / inyectable |
|---|---|---|
| Frecuencia | 13,56 MHz | 134,2 kHz |
| Norma | ISO 14443 / 15693 (NTAG21x, ICODE) | ISO 11784/11785 (FDX-B, HDX) |
| ¿Lo lee un celular? | Sí, Android con NFC | **No.** Ningún celular alcanza esa banda |
| ¿Se puede grabar? | Sí, desde la aplicación | No: viene grabado de fábrica, es de solo lectura |
| Captura en la finca | Acercando el celular | Bastón lector, que se comporta como teclado |

Esto no es un detalle de implementación: es el motivo por el que existen dos
modos separados en la interfaz. Prometer "programar el chip de la piel desde el
celular" sería mentir; ese chip solo se puede **registrar**, no programar.

## Decisiones

### 1. Web NFC, no aplicación nativa

Web NFC funciona en Chrome sobre Android, exige HTTPS y no existe en iOS. Se
asumió la limitación en vez de construir una aplicación nativa: el proyecto ya
es una PWA con cola offline, y Android cubre el parque de equipos de la finca.
`detectNfcSupport()` explica el bloqueo y qué equipo sí sirve, en vez de
esconder el botón.

### 2. Dos registros NDEF en cada arete

```
1. url                    https://<host>/scanner?id=<id>
2. villaluz.co:animal     VL1|<id>|<record>|<finca>|<H|M>|<AAAAMMDD>|<raza>
```

El primero hace que **cualquier** celular con NFC —el del comprador, el del
funcionario del ICA— abra la ficha sin tener la aplicación. El segundo permite
identificar al animal sin señal y sin haberlo descargado antes.

El formato del segundo registro es texto delimitado y no JSON por una razón
medible: el arete más barato del mercado (NTAG213) tiene 144 bytes útiles y el
mismo contenido en JSON no cabe junto con la URL. `estimateNdefBytes()` calcula
el tamaño antes de grabar y avisa si el chip elegido se queda corto, porque una
grabación que falla a medias obliga a volver a encerrar al animal.

### 3. El vínculo autoritativo vive en la base de datos, no en el chip

El chip se puede arrancar, clonar o reescribir. `nfc_uid` (serial de fábrica,
único mundialmente) queda en la ficha del animal, con restricción de unicidad
**global y no por finca**: el mismo serial en dos fincas siempre es un dato
equivocado, nunca dos animales distintos.

### 4. Una pausa obligatoria: el arete que ya tiene dueño

Es el único punto donde el flujo se detiene a preguntar. Sobreescribir sin
avisar deja a dos animales compartiendo identidad, y eso solo se descubre meses
después, cuando ya no se sabe cuál historia clínica es de cuál. La detección usa
primero lo que trae escrito el propio chip —funciona sin señal— y solo consulta
al servidor si el arete viene en blanco y hay conexión.

### 5. Un fallo no detiene la manga

Si un arete no graba, el animal queda marcado como fallido y **sale de la fila**
para que el siguiente pueda pasar. Al cerrar la jornada, un botón devuelve
todos los fallidos a la fila. La alternativa —trancar la manga hasta que ese
arete ceda— es inviable con veinte animales encerrados esperando.

### 6. La explicación viaja con la herramienta

Quien marca los aretes puede no saber qué es un navegador ni dónde queda la
antena del celular. La restricción «Chrome sobre Android con NFC prendido y
HTTPS» es cuatro condiciones encadenadas, y cada una falla de forma distinta.

Por eso la ayuda no es un manual aparte —que nadie abre en el corral— sino
parte del panel:

- Cuando el equipo **no sirve**, el aviso da el motivo y debajo van los cuatro
  pasos para dejar un celular listo. Los textos nombran los botones por su
  color y su dibujo («la bolita de colores»), no por su nombre técnico.
- Cuando el equipo **sí sirve**, «¿Cómo se graba un arete?» aparece abierta
  mientras no se haya grabado nada y se cierra después. Incluye un dibujo del
  celular visto por detrás con la zona de lectura marcada: casi nadie sabe la
  primera vez que la antena está en la espalda y no en la pantalla.
- Los tres tropiezos de siempre —no vibra, arete con dueño, arete que no
  graba— tienen su propia respuesta, porque son los que detienen la jornada.

El texto vive en `model/helpSteps.ts` como datos, separado de su presentación:
así se corrige la redacción sin tocar componentes, que es lo que va a pasar
cuando alguien vuelva del corral con una frase que no se entendió.

## Flujo de campo

```
Iniciar marcaje
      │
      ▼
[esperando] ──acerca el arete──► ¿ya tiene dueño?
      ▲                              │        │
      │                            no│        │sí
      │                              ▼        ▼
      │                          [grabando]  [conflicto] ──decide──┐
      │                              │                             │
      │              ┌───comprobar───┤                             │
      │              ▼               ▼ (sin comprobación)          │
      │        [verificando]     vinculado ──► siguiente animal    │
      │              │                                             │
      └──────────────┴─────────────────────────────────────────────┘
```

Todo el flujo avanza solo. El operario únicamente acerca el arete; la pantalla
muestra una sola instrucción a la vez y el resultado se avisa por vibración,
tono y voz en `es-CO`, porque a pleno sol y con el celular a la altura de la
oreja del animal la pantalla no se alcanza a ver.

## Consistencia de datos (regla 5.1)

- La grabación del chip ocurre en el celular; la vinculación se registra por
  `POST /api/v1/animals/nfc/bind`.
- Sin señal, el cliente HTTP encola la operación y responde 202 con
  `__offlineQueued`. `nfcBindingService` **no** la reporta como confirmada: la
  interfaz muestra «esperando señal» y cuenta las pendientes. Encolar no es
  persistir.
- Toda vinculación confirmada limpia la caché del servicio de animales y emite
  `emitDataRefresh('animals')`: el arete cambia la identidad del animal y los
  listados, el buscador y las fichas abiertas no pueden seguir mostrando el
  estado anterior.

## Estructura

```
frontend/src/features/nfc-tagging/
├── api/nfcBinding.service.ts     Registro del vínculo; distingue confirmado de encolado
├── model/
│   ├── ndefPayload.ts            Contenido del chip y presupuesto de bytes (puro)
│   ├── nfcSession.ts             Fila de marcaje: reductor puro
│   ├── nfcReader.ts              Envoltura de Web NFC y traducción de errores
│   ├── nfcSupport.ts             Capacidades del equipo
│   ├── fieldFeedback.ts          Vibración, tono y voz
│   ├── useNfcTagging.ts          Orquestación de los anteriores
│   ├── helpSteps.ts              Instrucciones para el operario, como datos
│   └── webNfc.d.ts               Tipos de Web NFC (no están en lib.dom)
└── ui/                           Panel de campo, lista, conflicto, configuración
                                  y la ayuda (pasos + dibujo del celular)

backend/
├── app/models/electronic_id_mixin.py          Columnas nfc_uid / nfc_written_at / lf_tag_code
├── app/services/nfc/tag_binding_service.py    Normalización, unicidad y conflicto
├── app/namespaces/animals/animal_nfc_namespace.py   bind / unbind / lookup
└── migrations/versions/nfc001_animal_electronic_id.py   (aplicada 2026-08-19)
```

Las dos piezas donde un error no se puede probar en el potrero —el contenido
del chip y el avance de la fila— son funciones puras con pruebas:
`ndefPayload.test.ts` y `nfcSession.test.ts`. La vinculación del servidor está
cubierta por `backend/tests/test_animal_nfc_binding.py`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Aplicación nativa Android para el NFC | Duplica despliegue y autenticación para una función que Web NFC ya cubre en el mismo parque de equipos |
| Guardar solo la URL en el chip | Inútil sin señal, que es la condición normal del potrero |
| JSON en el registro externo | No cabe en un NTAG213 junto con la URL |
| Bloquear el arete siempre | Irreversible e impide reutilizar aretes; queda como opción explícita para animales de venta o certificación |
| Unicidad del serial por finca | El serial es único de fábrica en el mundo; permitir el duplicado convertiría un error real en dato válido |

## Pendiente

- Lectura del arete desde `AnimalScannerPage` (hoy el escáner solo usa cámara).
  El contenido del chip ya está diseñado para eso: `parseAnimalSnapshot()`
  devuelve la ficha sin necesidad de consultar al servidor.
- Soporte para bastones lectores BLE que no emulen teclado.
