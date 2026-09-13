import { SanidadModulePage } from '../sanidad';

/**
 * Vista Casos clínicos del Módulo Sanidad.
 *
 * La ruta `/admin/disease-animals` renderiza el módulo unificado (casos
 * clínicos + tratamientos) con esta vista como destino directo. El punto de
 * entrada se conserva para que los enlaces existentes, el RBAC y las
 * búsquedas no cambien.
 */
const AdminAnimalDiseasesPage = () => <SanidadModulePage defaultView="casos" />;

export default AdminAnimalDiseasesPage;
