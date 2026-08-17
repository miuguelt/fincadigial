import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { inventoryService } from '@/entities/inventory/api/inventory.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import type { InventoryLotResponse, InventoryLotInput } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';

const InventoryPage: React.FC = () => {
  const initialFormData: InventoryLotInput = {
    product_type: 'Medicamento',
    lot_number: '',
    quantity: 0,
    unit: 'ml',
    expiry_date: new Date().toISOString().split('T')[0],
    min_stock: 5,
  };

  const crudConfig: CRUDConfig<InventoryLotResponse, InventoryLotInput> = {
    entityName: 'Lote de Inventario',
    title: 'Inventario de Medicamentos y Vacunas',
    searchPlaceholder: 'Buscar por lote o proveedor...',
    columns: [
      {
        key: 'product_name',
        label: 'Producto',
        render: (val: any, item: InventoryLotResponse) => {
          const isVaccine = item.product_type === 'Vacuna';
          return (
            <div className="flex flex-col">
              <span className="font-bold text-foreground inline-flex items-center gap-1.5">
                <span>{isVaccine ? '💉' : '💊'}</span> {val || '---'}
              </span>
              <span className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 w-max px-1.5 py-0.5 rounded mt-1">
                {item.product_type}
              </span>
            </div>
          );
        }
      },
      {
        key: 'lot_number',
        label: 'Lote',
        render: (val: any) => <Badge variant="outline" className="font-mono">{val}</Badge>
      },
      {
        key: 'current_quantity',
        label: 'Stock',
        render: (val: any, item: InventoryLotResponse) => (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${item.is_low_stock ? 'text-destructive' : 'text-primary'}`}>
              {val} {item.unit}
            </span>
            {item.is_low_stock && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        )
      },
      {
        key: 'expiry_date',
        label: 'Vencimiento',
        render: (val: any, item: InventoryLotResponse) => (
          <div className="flex flex-col">
            <span className={item.is_expired ? 'text-destructive font-bold' : ''}>
              {val ? formatDateColombia(val) : '---'}
            </span>
            {item.days_to_expiry !== undefined && item.days_to_expiry > 0 && item.days_to_expiry <= 30 && (
              <span className="text-[11px] text-warning font-medium">
                Vence en {item.days_to_expiry} días
              </span>
            )}
          </div>
        )
      },
      {
        key: 'supplier',
        label: 'Proveedor',
      }
    ],
    formSections: [
      {
        title: 'Información del Producto',
        fields: [
          {
            name: 'product_type',
            label: 'Tipo de Producto',
            type: 'select',
            required: true,
            options: [
              { label: 'Medicamento', value: 'Medicamento' },
              { label: 'Vacuna', value: 'Vacuna' },
            ],
          },
          {
            name: 'medication_id',
            label: 'Medicamento',
            type: 'select',
            dependsOn: 'product_type',
            showIf: (data: InventoryLotInput) => data.product_type === 'Medicamento',
            required: true,
            loadOptions: async () => {
              const meds = await medicationsService.getAll();
              return meds.map((m: any) => ({ label: m.name, value: m.id }));
            }
          },
          {
            name: 'vaccine_id',
            label: 'Vacuna',
            type: 'select',
            dependsOn: 'product_type',
            showIf: (data: InventoryLotInput) => data.product_type === 'Vacuna',
            required: true,
            loadOptions: async () => {
              const vacs = await vaccinesService.getAll();
              return vacs.map((v: any) => ({ label: v.name, value: v.id }));
            }
          },
        ]
      },
      {
        title: 'Detalles del Lote',
        fields: [
          {
            name: 'lot_number',
            label: 'Número de Lote',
            type: 'text',
            required: true,
            placeholder: 'Ej: AB-1234',
          },
          {
            name: 'quantity',
            label: 'Cantidad Inicial',
            type: 'number',
            required: true,
            validation: { min: 0 },
          },
          {
            name: 'unit',
            label: 'Unidad de Medida',
            type: 'text',
            required: true,
            placeholder: 'ml, mg, dosis...',
          },
          {
            name: 'expiry_date',
            label: 'Fecha de Vencimiento',
            type: 'date',
            required: true,
          },
          {
            name: 'min_stock',
            label: 'Stock Mínimo (Alerta)',
            type: 'number',
            validation: { min: 0 },
          },
        ]
      },
      {
        title: 'Compra y Proveedor',
        fields: [
          {
            name: 'supplier',
            label: 'Proveedor',
            type: 'text',
          },
          {
            name: 'unit_cost',
            label: 'Costo Unitario',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'entry_date',
            label: 'Fecha de Ingreso',
            type: 'date',
          },
          {
            name: 'notes',
            label: 'Observaciones',
            type: 'textarea',
          },
        ]
      }
    ],
    enableEditModal: true,
    enableDelete: true,
    // El backend de inventario protege el borrado con sus movimientos y no
    // expone el endpoint CRUD genérico de dependencias.
    checkDependencies: false,
    enableDetailModal: true,
    customHeader: <div className="mt-4"><SanidadTabs /></div>,
  };

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={inventoryService}
      initialFormData={initialFormData}
    />
  );
};

export default InventoryPage;
