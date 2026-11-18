import Svg, { Path } from 'react-native-svg';

import { logoLevelForSize, LogoPalettes, logoParts, type LogoLevel, type LogoPalette } from '@/helpers/logo';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/i18n';

interface Props {
  size?: number;
  /** Mặc định chọn theo `size`: ≤ 40 bản gọn (lỗ rộng hơn), lớn hơn bản đầy đủ. */
  level?: LogoLevel;
  /** `auto` theo giao diện sáng/tối; `onPrimary` khi đặt trên nền xanh đậm. */
  variant?: 'auto' | 'brand' | 'dark' | 'onPrimary';
}

/** Logo VietBank: đồng tiền xưa với lỗ vuông xoay 45°. Hình học dùng chung với script xuất icon (helpers/logo.ts). */
export default function AppLogo({ size = 48, level, variant = 'auto' }: Props) {
  const { t } = useI18n();
  const scheme = useColorScheme();
  const parts = logoParts(level ?? logoLevelForSize(size));
  const palette: LogoPalette =
    variant === 'auto' ? LogoPalettes[scheme === 'dark' ? 'dark' : 'brand'] : LogoPalettes[variant];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel={t('common.appName')}>
      {parts.map((p, i) => (
        <Path key={i} d={p.d} fill={palette[p.paint]} fillRule={p.evenOdd ? 'evenodd' : 'nonzero'} />
      ))}
    </Svg>
  );
}
