import React, { useMemo } from 'react';
import { Activity, CalendarClock, ClipboardList, User } from 'lucide-react';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { useUserActivityData } from '../hooks/useUserActivityData';
import { useDerivedActivity } from '@/features/activity/model/useDerivedActivity';
import { UserActivityTimeline } from './UserActivityTimeline';
import { UserHistoryTables } from './UserHistoryTables';

interface UserActivityCardProps {
    user: any;
    navigate: (path: string) => void;
    className?: string;
}

const UserActivityContent: React.FC<{ user: any; navigate: (path: string) => void }> = ({ user, navigate }) => {
    const {
        loading,
        userAnimals,
        userGenetics,
        userAnimalFields,
        userAnimalDiseases,
        userTreatments,
        userVaccinations,
        userControls,
    } = useUserActivityData(user);

    const { items: allActivityItems } = useDerivedActivity({
        animals: userAnimals,
        treatments: userTreatments,
        vaccinations: userVaccinations,
        controls: userControls,
        fields: userAnimalFields,
        genetics: userGenetics,
        diseases: userAnimalDiseases,
    });

    const now = Date.now();

    const actions7 = useMemo(() => {
        return allActivityItems.filter((i) => now - i.ts <= 7 * 24 * 60 * 60 * 1000).length;
    }, [allActivityItems, now]);

    const actions30 = useMemo(() => {
        return allActivityItems.filter((i) => now - i.ts <= 30 * 24 * 60 * 60 * 1000).length;
    }, [allActivityItems, now]);

    const distinctAnimals30 = useMemo(() => {
        return new Set(
            allActivityItems
                .filter((i) => now - i.ts <= 30 * 24 * 60 * 60 * 1000)
                .map((i) => i.animal_id)
                .filter(Boolean)
        ).size;
    }, [allActivityItems, now]);

    const activeTreatmentsStats = useMemo(() => {
        return userTreatments.filter((t: any) => {
            if (!t.endDateRaw) return true;
            const endTs = new Date(t.endDateRaw).getTime();
            return Number.isFinite(endTs) ? endTs >= now : true;
        }).length;
    }, [userTreatments, now]);

    const lastActivityAt = allActivityItems.length > 0 ? allActivityItems[0].timestamp : null;

    return (
        <div className="space-y-6">
            {/* 1. Resumen Stats */}
            <CollapsibleCard title="Resumen" accent="slate" defaultCollapsed={false} className="bg-card">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Acciones (7/30)</p>
                            <Activity className="h-4 w-4 text-success" aria-hidden />
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {actions7} <span className="text-muted-foreground">/</span> {actions30}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Eventos recientes</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Mis animales</p>
                            <User className="h-4 w-4 text-success" aria-hidden />
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">{distinctAnimals30}</p>
                        <p className="text-[11px] text-muted-foreground">Involucrados (30d)</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Tratamientos activos</p>
                            <ClipboardList className="h-4 w-4 text-success" aria-hidden />
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">{activeTreatmentsStats}</p>
                        <p className="text-[11px] text-muted-foreground">En seguimiento</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Última actividad</p>
                            <CalendarClock className="h-4 w-4 text-info" aria-hidden />
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {loading ? '-' : lastActivityAt ? new Date(lastActivityAt).toLocaleDateString('es-CO') : '-'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            {loading
                                ? ''
                                : lastActivityAt
                                  ? new Date(lastActivityAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                                  : 'Sin eventos'}
                        </p>
                    </div>
                </div>
            </CollapsibleCard>

            {/* 2. Timeline de Actividad */}
            <UserActivityTimeline
                userRole={user?.role}
                loading={loading}
                allActivityItems={allActivityItems}
                navigate={navigate}
            />

            {/* 3. Tablas de Historial por Categoría */}
            <UserHistoryTables
                userRole={user?.role}
                navigate={navigate}
                userAnimals={userAnimals}
                userGenetics={userGenetics}
                userAnimalFields={userAnimalFields}
                userAnimalDiseases={userAnimalDiseases}
                userTreatments={userTreatments}
                userVaccinations={userVaccinations}
                userControls={userControls}
            />
        </div>
    );
};

export const UserActivityCard: React.FC<UserActivityCardProps> = ({ user, navigate, className = 'lg:col-span-2' }) => {
    return (
        <CollapsibleCard
            title="Tu Actividad"
            accent="emerald"
            defaultCollapsed={true}
            lazy={true}
            className={className}
        >
            <UserActivityContent user={user} navigate={navigate} />
        </CollapsibleCard>
    );
};
