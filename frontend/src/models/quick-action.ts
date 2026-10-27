export type QuickActionKey = 'transfer' | 'qr' | 'topup' | 'bills' | 'history';

export interface QuickAction {
  key: QuickActionKey;
  route?: string;
}

export interface GetQuickActionsRequest {
  userId: string;
}

export interface GetQuickActionsResponse {
  success: boolean;
  actions: QuickAction[];
  message?: string;
}
