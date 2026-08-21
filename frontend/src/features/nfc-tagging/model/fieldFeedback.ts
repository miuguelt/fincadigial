/**
 * Aviso sin mirar la pantalla.
 *
 * En el brete el operario tiene una mano en el animal y la otra en el celular,
 * a pleno sol y con el equipo a la altura de la oreja del animal. La pantalla
 * casi nunca se ve, así que el resultado se avisa por vibración, tono y voz.
 */

export type FeedbackKind = 'ok' | 'error' | 'attention';

const VIBRATION_PATTERNS: Record<FeedbackKind, number[]> = {
  // Un pulso corto: entró.
  ok: [80],
  // Tres pulsos largos: no entró, hay que repetir.
  error: [220, 90, 220, 90, 220],
  // Dos pulsos: hay que decidir algo antes de seguir.
  attention: [120, 80, 120],
};

const TONE_FREQUENCIES: Record<FeedbackKind, number[]> = {
  ok: [880],
  error: [300, 220],
  attention: [660, 660],
};

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
};

const playTone = (kind: FeedbackKind) => {
  const context = getAudioContext();
  if (!context) return;
  // El celular suspende el audio al bloquear la pantalla; reanudarlo es lo que
  // hace que el segundo animal de la jornada también suene.
  if (context.state === 'suspended') void context.resume().catch(() => {});

  TONE_FREQUENCIES[kind].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + index * 0.16;

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    // Rampa de volumen: un corte seco suena a chasquido en el parlante.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.16);
  });
};

const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* La voz es una ayuda, nunca un requisito para seguir marcando. */
  }
};

export interface FieldFeedbackOptions {
  /** Frase corta que se lee en voz alta. */
  say?: string;
  /** El operario puede apagar la voz cuando trabaja cerca de otras personas. */
  voiceEnabled?: boolean;
}

/** Avisa el resultado por los tres canales disponibles a la vez. */
export const notifyField = (kind: FeedbackKind, options: FieldFeedbackOptions = {}): void => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(VIBRATION_PATTERNS[kind]);
  }
  playTone(kind);
  if (options.say && options.voiceEnabled !== false) speak(options.say);
};

/**
 * Prepara el audio con un gesto del operario.
 *
 * Android bloquea el sonido hasta que la persona toca algo; sin esta llamada
 * al iniciar la jornada, el primer animal se graba en silencio.
 */
export const primeFieldFeedback = (): void => {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume().catch(() => {});
};
