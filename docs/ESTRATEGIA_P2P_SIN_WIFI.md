# Estrategia P2P sin internet para Villa Luz

## Decisión técnica

La PWA debe trabajar con dos capas, elegidas automáticamente:

1. **Red local sin internet (recomendada):** un portátil crea o comparte el
   hotspot y ejecuta Villa Luz. Los celulares se conectan a esa red, descubren
   el nodo por presencia y envían chat y operaciones al API local. No hace falta
   internet ni un dispositivo adicional.
2. **Sin ninguna red IP:** la PWA guarda todo en IndexedDB, pero no puede
   garantizar comunicación continua entre teléfonos. WebRTC necesita un canal
   de señalización para negociar la conexión y Web Bluetooth requiere seleccionar
   un periférico desde una acción del usuario; un navegador no puede actuar como
   servidor Bluetooth/HTTP permanente.

Por eso la app no muestra “activar P2P” ni pide escoger un nodo. Busca en
segundo plano el portátil/API local y los equipos de la misma finca. Si no hay
ruta, informa “Guardado en este equipo” y conserva la cola.

## Qué sí debe hacer el campesino

Sólo una vez por jornada:

1. Encender el hotspot o Wi‑Fi local del portátil que ejecuta Villa Luz.
2. Abrir la misma dirección local en los celulares.
3. Trabajar normalmente. Chat, formularios y registros se sincronizan solos.

Si no hay portátil ni red local, el trabajo sigue siendo seguro localmente; se
comparte cuando vuelva a aparecer una red o un nodo.

## Evolución para “sólo celulares”

Si se requiere comunicación nativa sin hotspot, la opción adecuada es una app
Android/iOS empaquetada (Capacitor/React Native) con Google Nearby Connections o
Wi‑Fi Direct. Esas APIs pueden descubrir y transportar datos sin conectividad IP
convencional, pero no están disponibles de forma equivalente para una PWA de
navegador.

