/**
 * Instrucciones para quien nunca ha grabado un arete.
 *
 * Están escritas para leerse de pie en el corral, por alguien que puede no
 * saber qué es un navegador ni dónde queda la antena del celular. Por eso cada
 * paso dice una sola cosa, nombra los botones por su color y su dibujo, y no
 * usa ninguna palabra que haya que buscar en otro lado.
 */

export interface HelpStep {
  title: string;
  detail: string;
}

/** Cómo dejar el celular listo. Se muestra cuando el equipo todavía no sirve. */
export const SETUP_STEPS: HelpStep[] = [
  {
    title: 'Consigue un celular Android',
    detail:
      'Los iPhone (los de Apple, con la manzanita) no dejan grabar aretes: es un candado del propio iPhone y no se puede quitar. Si el tuyo es iPhone, pídele prestado un Android a alguien de la finca. Para imprimir las etiquetas de papel sí sirve cualquier celular.',
  },
  {
    title: 'Abre la aplicación en Chrome',
    detail:
      'Chrome es la bolita de colores: un anillo rojo, amarillo y verde con un punto azul en la mitad. Si abriste la aplicación en otro lado, copia la dirección y pégala en Chrome. Con otros navegadores el celular no graba.',
  },
  {
    title: 'Prende el NFC del celular',
    detail:
      'Entra a Ajustes (el dibujo del engranaje), escribe «NFC» en el buscador de arriba y actívalo. En muchos celulares está en Ajustes → Conexiones → NFC. Si no aparece por ningún lado, ese celular no tiene NFC y toca usar otro.',
  },
  {
    title: 'Entra por la dirección con candado',
    detail:
      'Arriba, en la barra de la dirección, tiene que verse un candadito cerrado. Si en vez del candado dice «No seguro», el celular no deja grabar. Avísale a quien maneja el sistema para que te dé la dirección correcta.',
  },
];

/** Cómo grabar los aretes. Se muestra cuando el equipo ya está listo. */
export const USAGE_STEPS: HelpStep[] = [
  {
    title: 'Toca el botón verde «Iniciar marcaje»',
    detail:
      'El celular queda esperando. En la pantalla, con letra grande, aparece el nombre del animal al que le toca el arete.',
  },
  {
    title: 'Pega el arete a la espalda del celular',
    detail:
      'No a la pantalla: por detrás, en la parte de arriba y hacia el centro. Ahí está la antena. Mira el dibujo de al lado.',
  },
  {
    title: 'Sostenlo quieto hasta que vibre',
    detail:
      'Dos segundos, sin moverlo. Cuando vibra y suena, ya quedó grabado y el celular te dice en voz alta el nombre del animal. Si lo retiras antes de que vibre, no alcanza a grabar.',
  },
  {
    title: 'Retira y vuelve a acercarlo',
    detail:
      'Solo si dejaste puesta la comprobación. Es para estar seguros de que el arete quedó bien y no toca volver a encerrar el animal. Vuelve a sonar y ahí sí quedó listo.',
  },
  {
    title: 'Sigue con el siguiente animal',
    detail:
      'El celular pasa solo al que sigue: no tienes que tocar nada. Cuando el nombre en la pantalla cambie, ya puedes marcar el otro.',
  },
];

/** Qué hacer cuando algo no sale. Son los tres tropiezos de siempre. */
export const TROUBLESHOOT_STEPS: HelpStep[] = [
  {
    title: 'No vibra ni suena nada',
    detail:
      'Mueve el arete despacito por toda la espalda del celular, de arriba abajo. La antena no queda en el mismo sitio en todos los celulares; una vez que encuentres el punto, ya sabes dónde poner los demás.',
  },
  {
    title: 'Dice que el arete ya tiene dueño',
    detail:
      'Ese arete ya es de otro animal. Lo más seguro es coger un arete nuevo. Solo pásalo al animal de la pantalla si estás seguro de que al otro ya se lo quitaron, porque ese otro animal queda sin arete.',
  },
  {
    title: 'Un arete no quiere grabar',
    detail:
      'No detengas el trabajo por uno. Toca «Saltar este animal» y sigue con los demás; al final aparece un botón amarillo para volver a intentar con los que quedaron pendientes.',
  },
];
