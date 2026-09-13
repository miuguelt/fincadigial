import api from '@/shared/api/client';
import type { AxiosRequestConfig } from 'axios';
import { ApiFetchError, readStandardErrorPayload } from '@/shared/api/error-parser';
import type { Conversation, MarketOffer, MarketPage, MarketReport } from './types';

async function request<T>(path: string, method = 'GET', data?: unknown, key?: string): Promise<T> {
  // Direct request avoids persisted GET caches; private history stays in memory.
  const config: AxiosRequestConfig & { skipCache: boolean; skipOffline: boolean; skipErrorToast: boolean } = {
    url: `/market-offers${path}`, method, data, timeout: 15000,
    skipCache: true, skipOffline: true, skipErrorToast: true,
    ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
  };
  try {
    const response = await api.request<{ data: T }>(config);
    if (response.status === 202) throw new Error('El envío aún no está confirmado. Conéctate y vuelve a intentar.');
    return response.data.data;
  } catch (error) {
    if (error instanceof ApiFetchError) throw error;
    const parsed = readStandardErrorPayload(error);
    throw new ApiFetchError(parsed.message, { status: parsed.status, validationErrors: parsed.validationErrors });
  }
}
export const marketApi = {
  offer: (id: string) => request<MarketOffer>(`/${id}`),
  offers: (params: Record<string, string>) => request<MarketPage<MarketOffer>>(`?${new URLSearchParams(params)}`),
  create: (data: unknown, key: string) => request<MarketOffer>('', 'POST', data, key),
  update: (id: string, data: unknown) => request<MarketOffer>(`/${id}`, 'PATCH', data),
  contact: (id: string, message: string, key: string) => request<Conversation>(`/${id}/conversations`, 'POST', { message }, key),
  conversations: (page: number) => request<MarketPage<Conversation>>(`/conversations?page=${page}`),
  conversation: (id: string, before?: string) => request<Conversation>(`/conversations/${id}${before ? `?before=${encodeURIComponent(before)}` : ''}`),
  event: (id: string, data: unknown, key: string) => request<Conversation>(`/conversations/${id}/events`, 'POST', data, key),
  report: (id: string, reason: string) => request<{ id: string }>(`/${id}/report`, 'POST', { reason }),
  reports: () => request<MarketReport[]>('/reports'),
  resolve: (id: string, action: string) => request(`/reports/${id}`, 'PATCH', { action }),
};
