import React from 'react';

const INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Resuelve el formato en línea (negrita y código) sin usar HTML crudo. */
export const renderInline = (text: string): React.ReactNode[] =>
  text
    .split(INLINE_TOKEN)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground break-words"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });

export default renderInline;
