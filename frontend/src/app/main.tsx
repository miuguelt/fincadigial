import { createRoot } from 'react-dom/client';
import '@/app/styles/index.css';
import { AppProviders } from './AppProviders';
import {
  cleanupLegacyLocalStorage,
  registerChunkRecovery,
  registerPwa,
  scheduleTailwindCheck,
} from './bootstrap';
import { initStoragePersistence } from '@/shared/utils/storagePersistence';
import { initGlobalErrorReporting } from '@/shared/lib/errorReporter';
import { startFitAutoRegistry } from '@/shared/lib/fitAutoRegistry';
import { suppressChromeExtensionErrors } from '@/shared/utils/suppressExtensionErrors';

suppressChromeExtensionErrors();
initGlobalErrorReporting();
registerChunkRecovery();
cleanupLegacyLocalStorage();
startFitAutoRegistry();
registerPwa();
scheduleTailwindCheck();

if (typeof window !== 'undefined') {
  void initStoragePersistence().catch((error) => {
    console.warn('[Storage] Error al solicitar persistencia de almacenamiento:', error);
  });
}

void import('../shared/constants/enums')
  .then(({ refreshEnums }) => refreshEnums())
  .catch(() => undefined);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento raíz de la aplicación.');

createRoot(rootElement).render(<AppProviders />);
