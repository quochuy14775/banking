import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/authStore';
import type { FinancialHealth } from '@/models';
import { getFinancialHealth } from '@/services/financial-health.service';

export function useFinancialHealth(): FinancialHealth | null {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialHealth | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getFinancialHealth({ userId: user.id }).then((res) => {
      if (active && res.success && res.data) setData(res.data);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return data;
}
