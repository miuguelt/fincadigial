import { SanidadModulePage } from '../sanidad';

/**
 * Vista Tratamientos del Módulo Sanidad.
 *
 * La ruta `/admin/treatments` renderiza el módulo unificado (casos clínicos +
 * tratamientos) con esta vista como destino directo. El punto de entrada se
 * conserva para que los enlaces existentes, el RBAC y las búsquedas no cambien.
 */
const AdminTreatmentsPage = () => <SanidadModulePage defaultView="tratamientos" />;

export default AdminTreatmentsPage;
