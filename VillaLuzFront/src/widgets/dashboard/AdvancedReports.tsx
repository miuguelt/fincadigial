import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdvancedReports: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin/reports', { replace: true });
  }, [navigate]);

  return null;
};

export default AdvancedReports;
