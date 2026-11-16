import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { daysUntil } from '@/helpers';
import { useAuth } from '@/lib/authStore';
import type { BillCategory, BillDetail, BillProvider, SavingsGoal, SpendingInsight, SpendingSummary } from '@/models';
import { getBillProviders, getSavedBills } from '@/services/bill.service';
import {
  contributeToGoal,
  dismissInsight,
  getInsights,
  getSavingsGoals,
  getSpendingSummary,
} from '@/services/insight.service';

// Khối "Sắp đến hạn" trên Home chỉ nhìn 7 ngày tới (kể cả hóa đơn đã quá hạn).
const UPCOMING_WINDOW_DAYS = 7;

export interface UpcomingBill {
  bill: BillDetail;
  label: string;
  category: BillCategory;
}

/**
 * Hóa đơn đã lưu còn nợ, đến hạn trong 7 ngày tới hoặc đã quá hạn; tải lại mỗi lần Home được focus.
 * `reload` gọi lại sau khi thanh toán ngay trên Home.
 */
export function useUpcomingBills() {
  const { user } = useAuth();
  const [items, setItems] = useState<UpcomingBill[] | null>(null);
  const [providerList, setProviderList] = useState<BillProvider[]>([]);
  // Trả về hàm huỷ để kết quả về muộn (sau khi rời màn) không ghi đè state.
  const load = useCallback(() => {
    if (!user) return;
    let active = true;
    Promise.all([getSavedBills({ userId: user.id }), getBillProviders()]).then(([saved, providers]) => {
      if (!active || !saved.success) return;
      setProviderList(providers.items);
      const next = saved.items
        .filter(
          (s): s is typeof s & { bill: BillDetail } => !!s.bill && daysUntil(s.bill.dueDate) <= UPCOMING_WINDOW_DAYS,
        )
        .map((s) => ({
          bill: s.bill,
          label: s.label,
          category: providers.items.find((p) => p.id === s.providerId)?.category ?? 'electricity',
        }))
        .sort((a, b) => a.bill.dueDate.localeCompare(b.bill.dueDate));
      setItems(next);
    });
    return () => {
      active = false;
    };
  }, [user]);

  useFocusEffect(load);
  const reload = useCallback(() => {
    load();
  }, [load]);

  return { items, providers: providerList, reload };
}

export function useSpendingSummary(): SpendingSummary | null {
  const { user } = useAuth();
  const [data, setData] = useState<SpendingSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getSpendingSummary({ userId: user.id }).then((res) => {
      if (active && res.success && res.data) setData(res.data);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return data;
}

export function useInsights() {
  const { user } = useAuth();
  const [items, setItems] = useState<SpendingInsight[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getInsights({ userId: user.id }).then((res) => {
      if (active && res.success) setItems(res.items);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    dismissInsight({ insightId: id });
  }, []);

  return { items, dismiss };
}

export function useSavingsGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getSavingsGoals({ userId: user.id }).then((res) => {
      if (active && res.success) setGoals(res.items);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const contribute = useCallback(
    async (goalId: string, amount: number) => {
      if (!user) return { success: false };
      const res = await contributeToGoal({ userId: user.id, goalId, amount });
      if (res.success && res.goal) {
        const updated = res.goal;
        setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      }
      return res;
    },
    [user],
  );

  return { goals, contribute };
}
