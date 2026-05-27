import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { useAuth } from '@/features/auth/model/useAuth';
import { Role } from '@/entities/user/model/types';

const roleDestinations: Record<string, string> = {
  Administrador: '/admin/dashboard',
  Propietario: '/admin/dashboard',
  Capataz: '/admin/dashboard',
  Instructor: '/instructor/dashboard',
  Veterinario: '/veterinario/dashboard',
  Aprendiz: '/apprentice/dashboard',
  Operario: '/operario/dashboard',
};

const RoleDashboardRedirect: React.FC = () => {
  const { role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparando tu panel..." />;
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = role as Role;
  const destination = roleDestinations[normalizedRole] ?? '/admin/dashboard';

  return <Navigate to={destination} replace />;
};

export default RoleDashboardRedirect;
