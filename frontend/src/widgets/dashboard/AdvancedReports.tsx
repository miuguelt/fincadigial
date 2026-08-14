import { useEffect } from 'react';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

const AdvancedReports: React.FC = () => {
  const { goTo } = useRoleNavigation();

  useEffect(() => {
    goTo('/admin/reports', { replace: true });
  }, [goTo]);

  return null;
};

export default AdvancedReports;
