import { apiClient } from '@/shared/api/client';

export interface InvitationRequest {
  finca_id: number;
  user_id?: number;
  email?: string;
  role?: string;
  notes?: string;
  expires_hours?: number;
  method?: 'email' | 'link' | 'qr' | 'code';
  max_uses?: number;
}

export interface InvitationResponse {
  id: number;
  token: string;
  url: string;
  qr_data: string;
  expires_at: string;
  method: string;
}

export interface InvitationListItem {
  id: number;
  user_id: number;
  user_fullname: string;
  user_email: string;
  finca_id: number;
  finca_name: string;
  type: string;
  status: string;
  requested_role: string;
  notes: string | null;
  invitation_method: string | null;
  expires_at: string | null;
  is_expired: boolean;
  max_uses: number;
  current_uses: number;
  created_at: string;
}

export interface PendingInvitations {
  sent: InvitationListItem[];
  received: InvitationListItem[];
}

export interface TokenValidation {
  valid: boolean;
  reason?: string;
  finca_name?: string;
  role?: string;
  expires_at?: string;
  inviter?: string;
}

export const invitationService = {
  create: (data: InvitationRequest) =>
    apiClient.post<InvitationResponse>('/invitations/create', data),

  acceptByToken: (token: string) =>
    apiClient.post('/invitations/accept', { token }),

  respond: (requestId: number, approve: boolean) =>
    apiClient.post(`/invitations/${requestId}/respond`, { approve }),

  cancel: (requestId: number) =>
    apiClient.post(`/invitations/${requestId}/cancel`),

  getPending: () =>
    apiClient.get<PendingInvitations>('/invitations/pending'),

  validateToken: (token: string) =>
    apiClient.get<TokenValidation>(`/invitations/${token}/validate`),
};
