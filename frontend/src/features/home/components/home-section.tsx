import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

interface Props {
  title: string;
  /** Chữ phụ bên phải tiêu đề (vd "7 ngày tới"); bị thay bằng `action` nếu có. */
  meta?: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Không vẽ nền thẻ: dùng khi nội dung bên trong tự có thẻ riêng (vd các vé hóa đơn). */
  bare?: boolean;
}

/** Khung chung cho các khối trên Home: tiêu đề + chữ phụ/hành động bên phải. */
export default function HomeSection({ title, meta, action, children, style, bare }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[bare ? styles.bare : styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
            {({ pressed }) => <Text style={[styles.action, pressed && styles.pressed]}>{action.label}</Text>}
          </Pressable>
        ) : (
          meta && <Text style={styles.meta}>{meta}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    card: {
      paddingHorizontal: Spacing.three,
      paddingVertical: 14,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    bare: { paddingHorizontal: Spacing.half },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: Spacing.two + 2,
    },
    title: { ...Typography.heading, color: theme.text },
    meta: { ...Typography.callout, color: theme.textSecondary },
    action: { ...Typography.callout, fontWeight: '600', color: theme.primary },
    pressed: { opacity: 0.6 },
  });
}
