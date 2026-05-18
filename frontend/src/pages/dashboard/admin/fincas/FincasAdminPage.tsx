import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDConfig } from '../../../../shared/types/crud';
import { apiClient } from '@/shared/api/client';
import { Building2, Plus, Users } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { InviteUserDialog } from '../../../../features/multi-finca/ui/InviteUserDialog';

const fincasConfig: CRUDConfig<any, any> = {
  title: 'Gestión de Fincas',
  entityName: 'Finca',
  columns: [
    { label: 'ID', key: 'id', sortable: true },
    { label: 'Nombre', key: 'name', sortable: true },
    { label: 'Ubicación', key: 'location', sortable: true },
    { label: 'Hectáreas', key: 'size_ha', sortable: true },
    { label: 'Estado', key: 'status', sortable: true },
  ],
  formSections: [
    {
      title: 'Información General',
      fields: [
        { name: 'name', label: 'Nombre de la Finca', type: 'text', required: true },
        { name: 'location', label: 'Ubicación', type: 'text', required: true },
        { name: 'size_ha', label: 'Tamaño (Hectáreas)', type: 'number', required: false },
        { name: 'description', label: 'Descripción', type: 'textarea', required: false },
      ]
    }
  ],
  searchPlaceholder: 'Buscar fincas...',
  exportable: true,
} as any;

const FincasAdminPage: React.FC = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [selectedFincaId, setSelectedFincaId] = React.useState<number | null>(null);

  const handleInvite = (fincaId: number) => {
    setSelectedFincaId(fincaId);
    setInviteDialogOpen(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <AdminCRUDPage
        config={{
          ...fincasConfig,
          customActions: (row: any) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInvite(row.id)}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Invitar
            </Button>
          )
        }}
        service={{
          getAll: (params: any) => apiClient.get('/api/v1/fincas', { params }).then(r => r.data),
          getPaginated: (params: any) => apiClient.get('/api/v1/fincas', { params }).then(r => r.data),
          getById: (id: number | string) => apiClient.get(`/api/v1/fincas/${id}`).then(r => r.data),
          create: (data: any) => apiClient.post('/api/v1/fincas', data).then(r => r.data),
          update: (id: number | string, data: any) => apiClient.put(`/api/v1/fincas/${id}`, data).then(r => r.data),
          delete: (id: number | string) => apiClient.delete(`/api/v1/fincas/${id}`).then(r => r.data),
        }}
        initialFormData={{
          name: '',
          location: '',
          size_ha: 0,
          description: '',
        }}
      />

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        fincaId={selectedFincaId}
      />
    </div>
  );
};

export default FincasAdminPage;
