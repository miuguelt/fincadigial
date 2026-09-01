import { useEffect, useMemo, useState } from 'react';
import api from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  OFFLINE_STORAGE_KEY,
  TOOL_GROUPS,
  TIPS_FALLBACK,
  type DashboardTip,
  type ToolGroup,
} from '../config/dashboard.config';

interface TipResponse {
  icon?: string;
  text?: string;
}

const readPendingCount = (): number => {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!stored) return 0;
    const items: unknown = JSON.parse(stored);
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
};

const isDashboardTip = (value: TipResponse): value is DashboardTip => (
  typeof value.text === 'string' && value.text.length > 0
);

const readTips = async (): Promise<DashboardTip[]> => {
  try {
    const response = await api.get('/intelligence/tips');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data)
      ? data.filter((tip): tip is TipResponse => Boolean(tip && typeof tip === 'object'))
        .filter(isDashboardTip)
      : [];
  } catch {
    return [];
  }
};

const filterToolGroups = (groups: ToolGroup[], searchTerm: string): ToolGroup[] => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return groups;

  return groups.map((group) => ({
    ...group,
    tools: group.tools.filter((tool) => (
      tool.title.toLowerCase().includes(term)
      || tool.description.toLowerCase().includes(term)
      || tool.emoji.includes(term)
    )),
  })).filter((group) => group.tools.length > 0);
};

export function useCampesinoDashboardState() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === 'undefined' || navigator.onLine
  ));
  const [pendingCount, setPendingCount] = useState(0);
  const [tips, setTips] = useState<DashboardTip[]>(TIPS_FALLBACK);
  const [tipIndex, setTipIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    void readTips().then((nextTips) => {
      if (nextTips.length === 0) return;
      setTips(nextTips);
      setTipIndex(Math.floor(Math.random() * nextTips.length));
    }).catch(() => undefined);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    setPendingCount(readPendingCount());
  }, []);

  const filteredGroups = useMemo(
    () => filterToolGroups(TOOL_GROUPS, searchTerm),
    [searchTerm],
  );
  const tip = tips.length > 0 ? tips[tipIndex % tips.length] : null;

  return {
    user,
    isOnline,
    pendingCount,
    searchTerm,
    setSearchTerm,
    filteredGroups,
    tip,
  };
}
