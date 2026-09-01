// Identificación electrónica del animal: grabar chapetas NFC desde el celular y
// registrar transpondedores de bolo o inyectable leídos con bastón externo.

export { NfcProgrammingPanel } from './ui/NfcProgrammingPanel';
export { NfcConfigSection } from './ui/NfcConfigSection';
export { LfCapturePanel } from './ui/LfCapturePanel';
export { NfcSupportNotice } from './ui/NfcSupportNotice';
export { NfcUsageHelp } from './ui/NfcUsageHelp';

export { useNfcTagging } from './model/useNfcTagging';
export { detectNfcSupport, type NfcSupport } from './model/nfcSupport';
export {
  DEFAULT_NFC_SETTINGS,
  type NfcTagAnimal,
  type NfcTagSettings,
  type NfcTagType,
} from './model/types';
export {
  TAG_CAPACITIES,
  buildTagRecords,
  estimateNdefBytes,
  parseAnimalSnapshot,
} from './model/ndefPayload';
export { nfcBindingService, TagConflictError } from './api/nfcBinding.service';
