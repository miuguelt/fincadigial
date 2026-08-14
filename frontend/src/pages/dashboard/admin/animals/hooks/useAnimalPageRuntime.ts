import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { useAncestorTreeDialog, useDescendantTreeDialog } from './useAnimalTreeDialogs';
import { useAnimalLookups } from './useAnimalLookups';
import { useAnimalDetails } from './useAnimalDetails';
import { initialFormData } from '../config/animals.config';
import type { BulkModal } from '../config/crud.behavior';

export function useAnimalPageRuntime() {
  const navigate = useNavigate();
  const { id: routeAnimalId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [, setFormData] = useState<Partial<AnimalInput>>(initialFormData);
  const [viewMode] = useGlobalViewMode();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [bulkModal, setBulkModal] = useState<BulkModal>(null);
  const [selectedAnimalsForPrint, setSelectedAnimalsForPrint] = useState<any[]>([]);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const selectedIdsRef = useRef<number[]>([]);
  const lookups = useAnimalLookups();
  const ancestors = useAncestorTreeDialog();
  const descendants = useDescendantTreeDialog();
  const details = useAnimalDetails(routeAnimalId);

  return {
    navigate,
    user,
    showToast,
    setFormData,
    viewMode,
    pendingImages,
    setPendingImages,
    bulkModal,
    setBulkModal,
    selectedAnimalsForPrint,
    setSelectedAnimalsForPrint,
    clearSelectionRef,
    selectedIdsRef,
    ...lookups,
    ancestors,
    descendants,
    details,
  };
}

export type AnimalPageRuntime = ReturnType<typeof useAnimalPageRuntime>;
