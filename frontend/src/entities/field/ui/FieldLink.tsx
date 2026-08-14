import React, { useState } from 'react';
import { FieldDetailsModal } from '@/widgets/analytics/FieldDetailsModal';

export const FieldLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-300 border backdrop-blur-md active:scale-[0.98] cursor-pointer bg-teal-500/5 text-teal-700 dark:text-teal-300 border-teal-500/20 hover:bg-teal-500/10 hover:border-teal-500/40 hover:shadow-[0_4px_12px_rgba(20,184,166,0.15)] hover:scale-[1.02]"
        title={`Click para ver detalles de ${label}`}
      >
        <span className="text-xs">🌱</span>
        <span className="fit-clamp max-w-[120px] font-bold">{label}</span>
      </button>

      <FieldDetailsModal
        fieldId={id}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};
