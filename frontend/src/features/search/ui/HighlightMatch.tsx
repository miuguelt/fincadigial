/**
 * Resalta dentro de un texto la parte que coincide con lo que se escribió.
 *
 * La comparación ignora tildes para que "vacunacion" encuentre "vacunación",
 * pero el resaltado se aplica sobre el texto original: recortarlo por índices
 * del texto normalizado devolvería la palabra sin acentos.
 */

/** Rango Unicode de marcas diacríticas combinantes (U+0300–U+036F). */
const COMBINING_MARKS = /[̀-ͯ]/gu;

const normalize = (value: string) => value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();

interface Props {
  text: string;
  query: string;
  className?: string;
}

export function HighlightMatch({ text, query, className }: Props) {
  const term = query.trim();
  if (!term || !text) return <span className={className}>{text}</span>;

  const index = normalize(text).indexOf(normalize(term));
  if (index === -1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {text.slice(0, index)}
      <span className="rounded bg-emerald-500/25 px-0.5 font-bold text-emerald-800 dark:text-emerald-200">
        {text.slice(index, index + term.length)}
      </span>
      {text.slice(index + term.length)}
    </span>
  );
}

export default HighlightMatch;
