import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/authStore';
import type { QuickAction } from '@/models';
import { getQuickActions } from '@/services/quick-action.service';

export function useQuickActions(): QuickAction[] {
  const { user } = useAuth();
  const [actions, setActions] = useState<QuickAction[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getQuickActions({ userId: user.id }).then((res) => {
      if (active && res.success) setActions(res.actions);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return actions;
}
