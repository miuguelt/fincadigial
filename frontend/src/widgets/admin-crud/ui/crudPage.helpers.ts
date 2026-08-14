import type { CRUDConfig } from '@/shared/types/crud';

export const DEFAULT_PAGE_SIZES = [25, 50, 100, 200];

export function getPageSizeOptions<T>(config: CRUDConfig<T>, currentPageSize: number): number[] | undefined {
  if (config.pageSizeOptions === null) return undefined;
  const configured = config.pageSizeOptions || DEFAULT_PAGE_SIZES;
  return Array.from(new Set([...configured, currentPageSize]))
    .filter((size) => Number.isFinite(size) && size > 0)
    .sort((a, b) => a - b);
}

export function withoutTombstones<T extends { id: number }>(items: T[], tombstoneIds: Set<string>): T[] {
  return items.filter((item) => !tombstoneIds.has(String(item.id)));
}

export function cloneFormData<T>(initialFormData: T): T {
  return JSON.parse(JSON.stringify(initialFormData)) as T;
}

export function extractValidationErrors(error: any): Record<string, unknown> | undefined {
  const candidates = [
    error?.validationErrors,
    error?.details?.validation_errors,
    error?.details?.errors,
    error?.response?.data?.errors,
  ];
  return candidates.find(isRecord);
}

export function getCrudErrorMessage(error: any, fallback: string): string {
  const candidates = [error?.response?.data?.message, error?.response?.data?.detail, error?.message];
  return candidates.find((value): value is string => typeof value === 'string' && value.length > 0) ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
