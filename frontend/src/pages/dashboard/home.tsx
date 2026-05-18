import React from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import AdminHome from './admin/home';
import InstructorHome from './instructor/home';
import ApprenticeHome from './apprentice/home';
import VetHome from './vet/home';
import OperatorHome from './operator/home';
import { Role } from "@/app/routes/routeConfig";
import { Loader } from "@/shared/ui/Loader";

const HomePage = () => {
    const { role, loading, isAuthenticated } = useAuth();
    const userRole = role as Role;

    // Estados de carga/validación: evitar fallback prematuro
    if (loading || (isAuthenticated && !userRole)) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
                <Loader />
                <span>Preparando tu inicio...</span>
            </div>
        );
    }

    console.log('🏠 HomePage - Role actual:', userRole, typeof userRole);

    if (userRole === 'Administrador' || userRole === 'Propietario' || userRole === 'Capataz') {
        return <AdminHome />;
    }
    if (userRole === 'Instructor') {
        return <InstructorHome />;
    }
    if (userRole === 'Veterinario') {
        return <VetHome />;
    }
    if (userRole === 'Aprendiz') {
        return <ApprenticeHome />;
    }
    if (userRole === 'Operario') {
        return <OperatorHome />;
    }
    
    // Fallback si el rol no coincide - mostrar AdminHome por defecto
    console.warn('⚠️ Rol no reconocido, mostrando AdminHome por defecto:', userRole);
    return <AdminHome />;
}

export default HomePage;
