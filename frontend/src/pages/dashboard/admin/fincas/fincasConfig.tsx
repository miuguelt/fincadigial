import { Building2, Eye, Globe, Lock } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import type { CRUDConfig } from '../../../../shared/types/crud';
import type { FarmAdminInput, FarmAdminRecord } from './types';

export const fincasConfig: CRUDConfig<FarmAdminRecord, FarmAdminInput> = {
  title: 'Todas las Fincas del Sistema',
  entityName: 'Finca',
  columns: [
    { label: 'ID', key: 'id', sortable: true, width: 70 },
    {
      label: 'Nombre',
      key: 'name',
      sortable: true,
      render: (_value, item) => (
        <div className="flex items-center gap-2.5">
          {item.primary_image_url || (item.images && item.images[0]?.url) ? (
            <img
              src={item.primary_image_url || item.images?.[0]?.url}
              alt={item.name}
              className="h-8 w-8 rounded-lg object-cover border border-border shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold text-foreground block fit-clamp">{item.name}</span>
            {item.nit && <span className="text-[11px] text-muted-foreground">NIT: {item.nit}</span>}
          </div>
        </div>
      ),
    },
    {
      label: 'Tipo',
      key: 'type',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'Educativa' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    { label: 'Departamento', key: 'department', sortable: true },
    { label: 'Municipio', key: 'municipality', sortable: true },
    {
      label: 'Privacidad',
      key: 'public_visibility',
      render: (value) => {
        if (value === 'full') {
          return (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit">
              <Globe className="h-3 w-3" />
              <span>Pública</span>
            </Badge>
          );
        }
        if (value === 'standard') {
          return (
            <Badge variant="outline" className="border-sky-500/40 text-sky-700 dark:text-sky-300 flex items-center gap-1 w-fit">
              <Eye className="h-3 w-3" />
              <span>Estándar</span>
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 flex items-center gap-1 w-fit">
            <Lock className="h-3 w-3" />
            <span>Mínima</span>
          </Badge>
        );
      },
    },
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
      title: 'Información General y Políticas de Privacidad',
      fields: [
        {
          name: 'name',
          label: 'Nombre de la Finca',
          type: 'text',
          required: true,
          suggestions: [
            'Hacienda Villa Luz',
            'Finca El Porvenir',
            'Finca La Pradera',
            'Hacienda San José',
            'Finca Bellavista',
            'Rancho Alegre',
          ],
        },
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
        {
          name: 'public_visibility',
          label: 'Política de Privacidad y Visibilidad',
          type: 'select',
          required: false,
          options: [
            { label: 'Mínima (Oculta estadísticas de ganado al público)', value: 'minimal' },
            { label: 'Estándar (Información institucional visible)', value: 'standard' },
            { label: 'Completa (Censo e inventario de ganado públicos)', value: 'full' },
          ],
          helperText: 'Define qué datos pecuarios se exponen en el catálogo público conforme a la Ley de Habeas Data.',
        },
        { name: 'nit', label: 'NIT / Identificación Tributaria', type: 'text' },
        {
          name: 'department',
          label: 'Departamento',
          type: 'text',
          suggestions: [
            'Caldas',
            'Antioquia',
            'Cundinamarca',
            'Meta',
            'Córdoba',
            'Cesar',
            'Santander',
            'Boyacá',
            'Tolima',
          ],
        },
        {
          name: 'municipality',
          label: 'Municipio',
          type: 'text',
          suggestions: [
            'Manizales',
            'Chinchiná',
            'Villamaría',
            'Medellín',
            'Villavicencio',
            'Montería',
            'Valledupar',
            'Neiva',
            'Ibagué',
          ],
        },
        {
          name: 'address',
          label: 'Dirección o Vereda',
          type: 'text',
          suggestions: [
            'Vereda El Rosario, Km 5',
            'Vereda La Cabaña',
            'Vereda Bajo Español',
            'Sector San Peregrino',
            'Vía Panamericana Km 12',
          ],
        },
        { name: 'is_active', label: 'Finca activa y operativa', type: 'checkbox' },
      ],
    },
  ],
  searchPlaceholder: 'Buscar fincas por nombre, departamento o municipio...',
  exportable: true,
  detailTitle: (item) => `Ficha de ${item.name}`,
} as CRUDConfig<FarmAdminRecord, FarmAdminInput>;
