import React from 'react';

/**
 * Dónde poner la chapeta en el celular.
 *
 * Un dibujo dice esto mejor que un párrafo: la antena no está en la pantalla
 * sino en la espalda del equipo, y casi nadie lo sabe la primera vez. Quien
 * apenas está aprendiendo a usar el celular no va a leer tres renglones de
 * explicación, pero sí entiende una figura.
 */
export const NfcPhoneDiagram: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 220 210"
    className={className}
    role="img"
    aria-label="Dibujo del celular visto por detrás: la chapeta se acerca a la parte de arriba de la espalda del celular"
  >
    {/* Cuerpo del celular, visto por detrás */}
    <rect
      x="58"
      y="10"
      width="86"
      height="140"
      rx="14"
      fill="currentColor"
      fillOpacity="0.08"
      stroke="currentColor"
      strokeOpacity="0.45"
      strokeWidth="2.5"
    />

    {/* Zona de lectura: arriba y al centro en la mayoría de equipos */}
    <ellipse cx="101" cy="58" rx="30" ry="26" fill="#10b981" fillOpacity="0.28" />
    <ellipse
      cx="101"
      cy="58"
      rx="30"
      ry="26"
      fill="none"
      stroke="#10b981"
      strokeWidth="2.5"
      strokeDasharray="6 5"
    />

    {/* Ondas de lectura */}
    <path
      d="M138 44a26 26 0 0 1 0 28"
      fill="none"
      stroke="#10b981"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M148 36a40 40 0 0 1 0 44"
      fill="none"
      stroke="#10b981"
      strokeWidth="3"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />

    {/* Cámara, para que se entienda que es la espalda del celular */}
    <rect
      x="70"
      y="24"
      width="18"
      height="18"
      rx="6"
      fill="currentColor"
      fillOpacity="0.25"
    />

    {/* La chapeta acercándose */}
    <g transform="translate(160 42)">
      <ellipse cx="18" cy="16" rx="17" ry="15" fill="#fbbf24" fillOpacity="0.9" />
      <circle cx="18" cy="16" r="5" fill="currentColor" fillOpacity="0.35" />
    </g>

    <text
      x="110"
      y="176"
      textAnchor="middle"
      fill="currentColor"
      fillOpacity="0.75"
      fontSize="13"
      fontWeight="700"
    >
      Espalda del celular
    </text>
    <text
      x="110"
      y="196"
      textAnchor="middle"
      fill="#10b981"
      fontSize="12"
      fontWeight="700"
    >
      Aquí se pone la chapeta
    </text>
  </svg>
);
