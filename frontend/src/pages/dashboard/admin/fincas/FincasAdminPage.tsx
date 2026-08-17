import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDConfig } from '../../../../shared/types/crud';
import { BaseService } from '@/shared/api/base-service';
import { Users } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { InviteUserDialog } from '../../../../features/multi-finca/ui/InviteUserDialog';

interface FarmAdminRecord {
  id: number;
  name: string;
  type: 'Educativa' | 'Tradicional';
  nit?: string;
  department?: string;
  municipality?: string;
  address?: string;
  is_active: boolean;
}

type FarmAdminInput = Omit<FarmAdminRecord, 'id'>;

export const fincasConfig: CRUDConfig<FarmAdminRecord, FarmAdminInput> = {
  title: 'Todas las Fincas del Sistema',
  entityName: 'Finca',
  columns: [
    { label: 'ID', key: 'id', sortable: true },
    { label: 'Nombre', key: 'name', sortable: true },
    { label: 'Tipo', key: 'type', sortable: true },
    { label: 'Departamento', key: 'department', sortable: true },
    { label: 'Municipio', key: 'municipality', sortable: true },
    {
      label: 'Estado',
      key: 'is_active',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
  ],
  formSections: [
    {
      title: 'Información General',
      fields: [
        { name: 'name', label: 'Nombre de la Finca', type: 'text', required: true },
        {
          name: 'type',
          label: 'Tipo de Finca',
          type: 'select',
          required: true,
          options: [
            { label: 'Tradicional', value: 'Tradicional' },
            { label: 'Educativa', value: 'Educativa' },
          ],
        },
        { name: 'nit', label: 'NIT', type: 'text' },
        { name: 'department', label: 'Departamento', type: 'text' },
        { name: 'municipality', label: 'Municipio', type: 'text' },
        { name: 'address', label: 'Dirección', type: 'text' },
        { name: 'is_active', label: 'Finca activa', type: 'checkbox' },
      ],
    },
  ],
  searchPlaceholder: 'Buscar en todas las fincas...',
  exportable: true,
} as CRUDConfig<FarmAdminRecord, FarmAdminInput>;

export const fincaFormDefaults: FarmAdminInput = {
  name: '',
  type: 'Tradicional',
  nit: '',
  department: '',
  municipality: '',
  address: '',
  is_active: true,
};

class FincasAdminService extends BaseService<FarmAdminRecord> {
  constructor() {
    super('fincas');
  }
}

export const fincasAdminService = new FincasAdminService();

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
          customActions: (row) => (
            <Button
              type="button"
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
        service={fincasAdminService}
        initialFormData={fincaFormDefaults}
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
