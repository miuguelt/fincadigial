import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { campesinoServices, MarketOffer } from '@/entities/campesino';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconShoppingCart, IconCalendar, IconPhone, IconMapPin } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const MarketOffersPage: React.FC = () => {
  const initialFormData: Partial<MarketOffer> = {
    offer_type: 'sale',
    product_name: '',
    currency: 'COP',
    status: 'active',
  };

  const columns: CRUDColumn<MarketOffer>[] = [
    {
      key: 'product_name',
      label: 'Producto',
      render: (val: string, item: MarketOffer) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{val}</span>
          <span className="text-xs text-muted-foreground">
            {item.quantity ? `${item.quantity} ${item.unit || ''}` : 'Cantidad no especificada'}
          </span>
        </div>
      ),
    },
    {
      key: 'offer_type',
      label: 'Tipo',
      render: (val: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          sale: 'default',
          purchase: 'secondary',
          exchange: 'outline',
        };
        const labels: Record<string, string> = {
          sale: 'Venta',
          purchase: 'Compra',
          exchange: 'Intercambio',
        };
        return <Badge variant={variants[val] || 'outline'}>{labels[val] || val}</Badge>;
      },
    },
    {
      key: 'price',
      label: 'Precio',
      render: (val: number, item: MarketOffer) => (
        <div className="font-medium text-primary">
          {val ? `$${Number(val).toLocaleString('es-CO')} ${item.currency || 'COP'}` : 'A convenir'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val: string) => (
        val === 'active' ? (
          <Badge variant="default">Activa</Badge>
        ) : (
          <Badge variant="secondary">{val || 'Inactiva'}</Badge>
        )
      ),
    },
    {
      key: 'contact_name',
      label: 'Contacto',
      render: (_val: any, item: MarketOffer) => (
        <div className="flex items-center gap-1 text-xs">
          <IconPhone size="sm" />
          {item.contact_name || '-'}
        </div>
      ),
    },
    {
      key: 'available_until',
      label: 'Disponible Hasta',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : '-'}
        </div>
      ),
    },
  ];

  const formSections: CRUDFormSection<Partial<MarketOffer>>[] = [
    {
      title: 'Datos del Producto',
      fields: [
        {
          name: 'product_name',
          label: 'Producto',
          type: 'text',
          required: true,
          placeholder: 'Ej: Leche, Yuca, Café, Ganado',
        },
        {
          name: 'offer_type',
          label: 'Tipo de Oferta',
          type: 'select',
          required: true,
          options: [
            { label: 'Venta', value: 'sale' },
            { label: 'Compra', value: 'purchase' },
            { label: 'Intercambio/Trueque', value: 'exchange' },
          ],
        },
        {
          name: 'quantity',
          label: 'Cantidad',
          type: 'number',
          min: 0,
          step: 0.01,
          placeholder: '0',
        },
        {
          name: 'unit',
          label: 'Unidad',
          type: 'text',
          placeholder: 'Ej: litros, kg, bultos, cabezas',
        },
      ],
    },
    {
      title: 'Precio y Vigencia',
      fields: [
        {
          name: 'price',
          label: 'Precio Unitario',
          type: 'number',
          min: 0,
          step: 100,
          placeholder: '0',
        },
        {
          name: 'currency',
          label: 'Moneda',
          type: 'select',
          options: [
            { label: 'Peso Colombiano (COP)', value: 'COP' },
            { label: 'Dólar (USD)', value: 'USD' },
            { label: 'Intercambio', value: 'EXCHANGE' },
          ],
        },
        {
          name: 'available_from',
          label: 'Disponible Desde',
          type: 'date',
        },
        {
          name: 'available_until',
          label: 'Disponible Hasta',
          type: 'date',
        },
      ],
    },
    {
      title: 'Contacto y Entrega',
      fields: [
        {
          name: 'contact_name',
          label: 'Nombre de Contacto',
          type: 'text',
          placeholder: 'Tu nombre',
        },
        {
          name: 'contact_phone',
          label: 'Teléfono',
          type: 'tel',
          placeholder: '300 123 4567',
        },
        {
          name: 'delivery_location',
          label: 'Lugar de Entrega',
          type: 'text',
          placeholder: 'Ej: Finca Villa Luz, Vereda El Centro',
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          options: [
            { label: 'Activa', value: 'active' },
            { label: 'Pausada', value: 'paused' },
            { label: 'Cerrada', value: 'closed' },
          ],
        },
        {
          name: 'notes',
          label: 'Notas',
          type: 'textarea',
          placeholder: 'Detalles adicionales...',
        },
      ],
    },
  ];

  const config: CRUDConfig<MarketOffer, Partial<MarketOffer>> = {
    entityName: 'Oferta',
    title: 'Mercado Campesino',
    searchPlaceholder: 'Buscar por producto...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
  };

  return (
    <AdminCRUDPage config={config} service={campesinoServices.marketOffers} initialFormData={initialFormData} />
  );
};

export default MarketOffersPage;
