/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="node" />

import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: string | boolean | undefined;
  }
}

// Web Bluetooth API Types
interface BluetoothRequestDeviceFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
  manufacturerId?: number;
  serviceData?: BluetoothServiceDataItemInit;
}

interface BluetoothRequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>;
  onavailabilitychanged: ((this: Bluetooth, ev: Event) => any) | null;
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  requestLEScan(options: BluetoothLEScanOptions): Promise<BluetoothLEScan>;
}

declare const __VITE_IMPORT_META_ENV__: Record<string, any> | undefined;

// Tipos para vite-plugin-pwa virtual modules
declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}
