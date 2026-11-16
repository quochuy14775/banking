import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { BillCategoryColors, type BillTileCategory } from '@/constants/bill-colors';
import { BillCategoryIcons } from '@/constants/icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Ô icon bo góc theo màu riêng của từng loại dịch vụ (điện, nước, internet...). */
export default function BillCategoryIcon({ category, size = 44 }: { category: BillTileCategory; size?: number }) {
  const scheme = useColorScheme();
  const colors = BillCategoryColors[category][scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolView name={BillCategoryIcons[category]} size={Math.round(size * 0.5)} tintColor={colors.fg} />
    </View>
  );
}
