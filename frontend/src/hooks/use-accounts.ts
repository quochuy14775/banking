import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/authStore';
import type { Account } from '@/models';
import { getAccounts } from '@/services/account.service';

// Các nơi đang hiện số dư (thẻ ở trang chủ, chọn tài khoản khi chuyển tiền/trả hóa đơn) cùng nghe một tín hiệu,
// để sau mỗi giao dịch thành công chỉ cần gọi `refreshAccounts()` là tất cả tải lại số dư mới.
const listeners = new Set<() => void>();

/** Gọi sau khi giao dịch thành công để mọi màn đang hiện số dư tải lại. */
export function refreshAccounts() {
  listeners.forEach((listener) => listener());
}

export function useAccounts(): Account[] {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () => {
      getAccounts({ userId: user.id }).then((res) => {
        if (active && res.success) setAccounts(res.items);
      });
    };
    load();
    listeners.add(load);
    return () => {
      active = false;
      listeners.delete(load);
    };
  }, [user]);

  return accounts;
}
