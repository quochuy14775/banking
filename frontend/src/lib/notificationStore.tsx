import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/authStore';
import type { AppNotification, NotificationCategory } from '@/models';
import * as notificationService from '@/services/notification.service';

interface NotificationContextValue {
  items: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (category?: NotificationCategory) => Promise<void>;
}

interface LoadedState {
  userId: string;
  items: AppNotification[];
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<LoadedState | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    notificationService.getNotifications({ userId: user.id }).then((res) => {
      if (active && res.success) setLoaded({ userId: user.id, items: res.items });
    });
    return () => {
      active = false;
    };
  }, [user]);

  const items = user && loaded?.userId === user.id ? loaded.items : [];
  const unreadCount = items.filter((n) => !n.read).length;

  function updateItems(update: (prev: AppNotification[]) => AppNotification[]) {
    setLoaded((prev) => (prev ? { ...prev, items: update(prev.items) } : prev));
  }

  async function markAsRead(id: string) {
    if (!user) return;
    const res = await notificationService.markNotificationRead({ userId: user.id, id });
    if (res.success) updateItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllAsRead(category?: NotificationCategory) {
    if (!user) return;
    const res = await notificationService.markAllNotificationsRead({ userId: user.id, category });
    if (res.success) {
      updateItems((prev) =>
        prev.map((n) => (!category || n.category === category ? { ...n, read: true } : n)),
      );
    }
  }

  return (
    <NotificationContext.Provider value={{ items, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
