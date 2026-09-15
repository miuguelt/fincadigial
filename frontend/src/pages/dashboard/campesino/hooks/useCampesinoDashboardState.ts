import { useEffect, useMemo, useState } from 'react';
import api from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import {
  TOOL_GROUPS,
  TIPS_FALLBACK,
  type DashboardTip,
  type ToolGroup,
} from '../config/dashboard.config';

interface TipResponse {
  icon?: string;
  text?: string;
}

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
      || (tool.emoji ? tool.emoji.includes(term) : false)
    )),
  })).filter((group) => group.tools.length > 0);
};

export function useCampesinoDashboardState() {
  const { user } = useAuth();
  const { isOnline, totalOperations: pendingCount } = useOnlineStatus();
  const [tips, setTips] = useState<DashboardTip[]>(TIPS_FALLBACK);
  const [tipIndex, setTipIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void readTips().then((nextTips) => {
      if (nextTips.length === 0) return;
      setTips(nextTips);
      setTipIndex(Math.floor(Math.random() * nextTips.length));
    }).catch(() => undefined);
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
