import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminIcons } from '@/constants/icons';
import { IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

import type { DocumentImage } from '../hooks/use-document-images';

interface Props {
  label: string;
  image: DocumentImage;
  onOpen: () => void;
  onRetry: () => void;
}

/** Ảnh thu nhỏ của hồ sơ: bấm để xem lớn; tải lỗi thì bấm để tải lại. */
export default function DocumentPhoto({ label, image, onOpen, onRetry }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();

  const onPress = image.status === 'ready' ? onOpen : image.status === 'error' ? onRetry : undefined;
  const a11yLabel = image.status === 'error' ? `${label}: ${t('admin.photos.retry')}` : t('admin.photos.open', { name: label });

  return (
    <View style={styles.item}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ busy: image.status === 'loading', disabled: !onPress }}
        style={({ pressed }) => [styles.frame, pressed && styles.pressed]}>
        {image.status === 'ready' && (
          <>
            {/* cachePolicy "none": ảnh hồ sơ là dữ liệu nhạy cảm, không lưu vào bộ nhớ đệm hay ổ đĩa của máy. */}
            <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" />
            <View style={styles.enlarge}>
              <SymbolView name={AdminIcons.enlarge} size={IconSize.sm} tintColor={theme.text} />
            </View>
          </>
        )}
        {image.status === 'loading' && <ActivityIndicator color={theme.primary} />}
        {image.status === 'error' && (
          <View style={styles.failed}>
            <SymbolView name={AdminIcons.photoError} size={IconSize.xl} tintColor={theme.danger} />
            <Text style={styles.failedText}>{t('admin.photos.loadFailed')}</Text>
            <Text style={styles.retryText}>{t('admin.photos.retry')}</Text>
          </View>
        )}
      </Pressable>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    item: { flex: 1, minWidth: 0, gap: Spacing.one },
    frame: {
      aspectRatio: 4 / 3,
      borderRadius: Radius.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundInset,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    pressed: { opacity: 0.8 },
    enlarge: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundElement,
      opacity: 0.9,
    },
    failed: { alignItems: 'center', gap: 2, paddingHorizontal: Spacing.one },
    failedText: { ...Typography.caption, color: theme.danger, textAlign: 'center' },
    retryText: { ...Typography.caption, color: theme.primary, fontWeight: '700' },
    label: { ...Typography.caption, color: theme.textSecondary, textAlign: 'center' },
  });
}
