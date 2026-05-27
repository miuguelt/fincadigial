import React from 'react';

import { FieldDetailsModal } from '@/widgets/analytics/FieldDetailsModal';
import type { FieldResponse } from '@/shared/api/generated/swaggerTypes';

interface FieldAnimalsModalProps {
  field: FieldResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FieldAnimalsModal: React.FC<FieldAnimalsModalProps> = ({ field, isOpen, onClose }) => (
  <FieldDetailsModal
    field={field as any}
    isOpen={isOpen}
    onClose={onClose}
    initialTab="animals"
  />
);
