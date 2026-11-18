import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Nút xác nhận màu đỏ (vd đăng xuất); mặc định màu thương hiệu. */
  destructive?: boolean;
  /** Đang gửi yêu cầu: khóa các nút, không đóng hộp được. */
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Hộp xác nhận vẽ bằng Modal. Không dùng Alert.alert vì trên web (react-native-web) Alert.alert không hiện gì.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  loading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const cancel = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={cancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel} accessible={false} />
        <View style={styles.card} role="alertdialog" accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              onPress={cancel}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.secondary, (pressed || loading) && styles.dim]}>
              <Text style={styles.secondaryText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructive : styles.primary,
                (pressed || loading) && styles.dim,
              ]}>
              {loading ? (
                <ActivityIndicator color={destructive ? theme.backgroundElement : theme.onPrimary} />
              ) : (
                <Text style={destructive ? styles.destructiveText : styles.primaryText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three, backgroundColor: theme.overlay },
    card: {
      width: '100%',
      maxWidth: 420,
      padding: Spacing.four,
      gap: Spacing.two,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      boxShadow: theme.cardShadow,
    },
    title: { ...Typography.heading, color: theme.text },
    message: { ...Typography.body, color: theme.textSecondary },
    error: { ...Typography.callout, color: theme.danger },
    actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
    button: { flex: 1, minHeight: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
    secondary: { backgroundColor: theme.backgroundMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
    secondaryText: { ...Typography.bodyStrong, color: theme.text },
    primary: { backgroundColor: theme.primary },
    primaryText: { ...Typography.bodyStrong, color: theme.onPrimary },
    // Chữ trên nền đỏ lấy màu nền thẻ: trắng ở theme sáng, gần đen ở theme tối (nền đỏ nhạt), đủ tương phản cả hai.
    destructive: { backgroundColor: theme.danger },
    destructiveText: { ...Typography.bodyStrong, color: theme.backgroundElement },
    dim: { opacity: 0.7 },
  });
}
