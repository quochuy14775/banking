import { useMemo } from 'react';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// `factory` phải là hàm khai báo ngoài component để memo không bị tạo lại mỗi lần render.
export function useThemedStyles<T>(factory: (theme: ThemeColors) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
