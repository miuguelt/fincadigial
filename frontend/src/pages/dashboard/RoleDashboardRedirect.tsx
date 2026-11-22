import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { useAuth } from '@/features/auth/model/useAuth';
import { Role } from '@/entities/user/model/types';

const roleDestinations: Record<string, string> = {
  // El destino inicial por defecto al iniciar sesión es el inventario de animales (/admin/animals)
  Administrador: '/admin/animals',
  Propietario: '/admin/animals',
  Capataz: '/admin/animals',
  Instructor: '/instructor/dashboard',
  Veterinario: '/veterinario/dashboard',
  Aprendiz: '/apprentice/dashboard',
  Operario: '/operario/dashboard',
};

const RoleDashboardRedirect: React.FC = () => {
  const { role, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Preparando tu panel..." />;
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = role as Role;
  const destination = roleDestinations[normalizedRole] ?? '/admin/animals';
  const target = location.search ? `${destination}${location.search}` : destination;

  return <Navigate to={target} replace />;
};

export default RoleDashboardRedirect;
