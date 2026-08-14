import React from 'react';
import { renderInline } from './LessonInline';

interface LessonTableProps {
  header: string[];
  rows: string[][];
}

/** Tabla con desplazamiento horizontal seguro: nunca desborda el ancho del contenedor. */
export const LessonTable: React.FC<LessonTableProps> = ({ header, rows }) => (
  <div className="my-5 overflow-x-auto rounded-lg border border-border shadow-sm">
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-secondary/60">
        <tr>
          {header.map((cell, index) => (
            <th
              key={index}
              scope="col"
              className="px-3 py-2 font-semibold text-foreground align-top break-words"
            >
              {renderInline(cell)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-t border-border/70 even:bg-secondary/25">
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className="px-3 py-2 align-top text-muted-foreground break-words"
              >
                {renderInline(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default LessonTable;
