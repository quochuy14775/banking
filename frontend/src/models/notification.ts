import type { TransactionType } from './transaction';

export type NotificationCategory = 'balance' | 'promotion' | 'system';

export interface NotificationTransaction {
  type: TransactionType;
  amount: number;
  accountNumber: string;
  counterpartyName: string;
  counterpartyBank?: string;
  counterpartyAccount?: string;
  description: string;
  balanceAfter: number;
}

export type NotificationType =
  | 'balance_in'
  | 'balance_out'
  | 'promotion'
  | 'bill'
  | 'goal'
  | 'security'
  | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  transaction?: NotificationTransaction;
}

export interface GetNotificationsRequest {
  userId: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  items: AppNotification[];
  unreadCount: number;
  message?: string;
}

export interface MarkNotificationReadRequest {
  userId: string;
  id: string;
}

export interface MarkNotificationReadResponse {
  success: boolean;
  message?: string;
}

export interface MarkAllNotificationsReadRequest {
  userId: string;
  category?: NotificationCategory;
}

export interface MarkAllNotificationsReadResponse {
  success: boolean;
  message?: string;
}
