import { useState } from 'react';
import { useContext } from 'react';
import { AuthContext } from '@/app/providers/AuthenticationContext';
import { InviteForm } from '@/features/invitations/ui/InviteForm';
import { PendingRequests } from '@/features/invitations/ui/PendingRequests';
import { JoinFincaForm } from '@/features/membership';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { FaUserPlus, FaInbox, FaSignInAlt } from 'react-icons/fa';

export const MembershipManagementPage = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const activeFincaId = user?.finca_id;
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeForm, setActiveForm] = useState<'invite' | 'join' | null>(null);

  const handleActionComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-bold">Gestión de Equipo</h1>

      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <FaUserPlus className="h-4 w-4" /> Invitar
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <FaInbox className="h-4 w-4" /> Pendientes
          </TabsTrigger>
          <TabsTrigger value="join" className="flex items-center gap-2">
            <FaSignInAlt className="h-4 w-4" /> Unirse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="mt-4">
          {activeFincaId ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Invita a un miembro sin salir de la gestión de equipo.</p>
              <Button type="button" onClick={() => setActiveForm('invite')}>Invitar miembro</Button>
              <GenericModal
                isOpen={activeForm === 'invite'}
                onOpenChange={(open) => !open && setActiveForm(null)}
                title="Invitar miembro al equipo"
                description="Busca un usuario o genera un enlace de invitación."
                size="2xl"
              >
                <InviteForm fincaId={activeFincaId} onSuccess={() => { handleActionComplete(); setActiveForm(null); }} />
              </GenericModal>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No tienes una finca activa. Crea o únete a una finca primero.
            </p>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingRequests key={refreshKey} onActionComplete={handleActionComplete} />
        </TabsContent>

        <TabsContent value="join" className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">Solicita acceso a otra finca desde un formulario flotante.</p>
          <Button type="button" onClick={() => setActiveForm('join')}>Solicitar acceso</Button>
          <GenericModal
            isOpen={activeForm === 'join'}
            onOpenChange={(open) => !open && setActiveForm(null)}
            title="Unirse a otra finca"
            description="Selecciona la finca, el rol y un mensaje opcional."
            size="lg"
          >
            <JoinFincaForm />
          </GenericModal>
        </TabsContent>
      </Tabs>
    </div>
  );
};
