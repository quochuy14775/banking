import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BankLogos } from '@/features/transfer/bank-logos';
import { Typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import type { Bank } from '@/models';

interface Props {
  bank: Bank;
  size?: number;
}

// Logo ngân hàng: ưu tiên ảnh đóng gói, rồi tới URL từ API; không có hoặc tải lỗi thì hiện ô mã.
export default function BankLogo({ bank, size: side = 36 }: Props) {
  const styles = useThemedStyles(createStyles);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // Bo góc theo tỉ lệ kiểu icon app để nhỏ hay lớn trông vẫn đồng bộ.
  const size = { width: side, height: side, borderRadius: Math.round(side * 0.24) };
  const bundled = BankLogos[bank.code];
  const remote = bank.logo && failedUri !== bank.logo ? bank.logo : undefined;
  const source = bundled ?? remote;

  if (!source) {
    return (
      <View style={[styles.box, styles.fallback, size]}>
        <Text style={styles.code} numberOfLines={1}>
          {bank.code}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, size]}>
      <Image
        source={source}
        style={styles.image}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
        onError={() => {
          if (!bundled) setFailedUri(bank.logo ?? null);
        }}
      />
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    // Nền trắng cố định cho icon có vùng trong suốt vẫn rõ ở theme tối.
    box: {
      backgroundColor: '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallback: { backgroundColor: theme.backgroundSelected, borderWidth: 0 },
    image: { width: '100%', height: '100%' },
    code: { ...Typography.micro, color: theme.onPrimarySoft, fontWeight: '700' },
  });
}
