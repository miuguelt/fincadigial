import { useCallback, useEffect, useMemo, useState } from 'react';
import { fincaService, Finca } from '@/entities/finca/api/finca.service';
import { membershipService } from '@/entities/user/api/membership.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';

/** El backend anida el mensaje en varias formas según el handler; se recorren
 *  todas las rutas conocidas y se devuelve la primera cadena útil. */
const pick = (source: any, key: string): any =>
  source && typeof source === 'object' ? source[key] : undefined;

const isUsefulText = (value: any): value is string => typeof value === 'string' && !!value.trim();

const readErrorMessage = (error: any, fallback: string): string => {
  const payload = pick(pick(error, 'response'), 'data') ?? pick(error, 'details') ?? pick(error, 'data') ?? error;
  const block = pick(payload, 'error') ?? payload;
  const candidates = [
    pick(block, 'message'),
    pick(block, 'detail'),
    pick(payload, 'message'),
    pick(error, 'message'),
  ];
  return candidates.find(isUsefulText) ?? fallback;
};

/** Ids de las fincas donde el usuario ya es miembro. En /auth/me cada item de
 *  `fincas` es una membresía: el id de la finca vive en `finca_id`. */
const readMemberFincaIds = (user: any): Set<number> => {
  const memberships = user?.fincas;
  if (!Array.isArray(memberships)) return new Set<number>();
  return new Set<number>(
    memberships
      .map((membership: any) => Number(membership?.finca_id ?? membership?.id))
      .filter((id: number) => Number.isFinite(id))
  );
};

const matchesSearch = (finca: Finca, term: string): boolean =>
  [finca.name, finca.department, finca.municipality, finca.location]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));

export const useJoinFincaForm = (onSuccess?: () => void) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loadingFincas, setLoadingFincas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [message, setMessage] = useState('');

  const loadFincas = useCallback(async () => {
    setLoadingFincas(true);
    setLoadError(null);
    try {
      // /fincas/public es el catálogo pensado para solicitar membresía;
      // /fincas es el listado interno y no sirve para unirse a otra finca.
      const response = await fincaService.getPublicFincas({ limit: 200 });
      setFincas(Array.isArray(response?.data) ? response.data : []);
    } catch (error: any) {
      const detail = readErrorMessage(error, 'No se pudo cargar el listado de fincas.');
      setLoadError(detail);
      showToast(detail, 'error', 8000);
    } finally {
      setLoadingFincas(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFincas();
  }, [loadFincas]);

  // El backend marca is_member/already_requested para la sesión actual; el set
  // local de membresías cubre el caso en que /fincas/public venga sin sesión.
  const availableFincas = useMemo(() => {
    const memberFincaIds = readMemberFincaIds(user);
    return fincas.filter(
      (finca) =>
        !finca.is_member && !finca.already_requested && !memberFincaIds.has(Number(finca.id))
    );
  }, [fincas, user]);

  const filteredFincas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return availableFincas;
    return availableFincas.filter((finca) => matchesSearch(finca, term));
  }, [availableFincas, search]);

  const submit = useCallback(async () => {
    if (!selectedFinca || !selectedRole) {
      showToast('Selecciona una finca y el rol que deseas tener.', 'warning', 6000);
      return;
    }

    setSubmitting(true);
    try {
      await membershipService.sendRequest({
        finca_id: Number(selectedFinca),
        requested_role: selectedRole,
        message: message.trim() || undefined,
      });
      showToast('Solicitud enviada. Un administrador de la finca destino debe aprobarla.', 'success', 8000);
      setSelectedFinca('');
      setSelectedRole('');
      setMessage('');
      setSearch('');
      onSuccess?.();
    } catch (error: any) {
      showToast(readErrorMessage(error, 'No se pudo procesar tu solicitud en este momento.'), 'error', 9000);
    } finally {
      setSubmitting(false);
    }
  }, [message, onSuccess, selectedFinca, selectedRole, showToast]);

  return {
    filteredFincas,
    hiddenCount: fincas.length - availableFincas.length,
    loadingFincas,
    loadError,
    reload: loadFincas,
    submitting,
    submit,
    search,
    setSearch,
    selectedFinca,
    setSelectedFinca,
    selectedRole,
    setSelectedRole,
    message,
    setMessage,
  };
};
