import { mockNotifications } from '@/lib/mockData';
import type {
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAllNotificationsReadRequest,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadRequest,
  MarkNotificationReadResponse,
} from '@/models';

const MISSING_USER = 'Thiếu thông tin người dùng.';

export async function getNotifications(req: GetNotificationsRequest): Promise<GetNotificationsResponse> {
  if (!req.userId) {
    return { success: false, items: [], unreadCount: 0, message: MISSING_USER };
  }
  return {
    success: true,
    items: mockNotifications,
    unreadCount: mockNotifications.filter((n) => !n.read).length,
  };
}

export async function markNotificationRead(
  req: MarkNotificationReadRequest,
): Promise<MarkNotificationReadResponse> {
  if (!req.userId || !req.id) return { success: false, message: MISSING_USER };
  return { success: true };
}

export async function markAllNotificationsRead(
  req: MarkAllNotificationsReadRequest,
): Promise<MarkAllNotificationsReadResponse> {
  if (!req.userId) return { success: false, message: MISSING_USER };
  return { success: true };
}
