import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminIcons } from '@/constants/icons';
import { IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { useI18n } from '@/i18n';

import type { DocumentImage } from '../hooks/use-document-images';

// Trình xem ảnh luôn nền đen ở cả hai theme (giống các trình xem ảnh khác) để ảnh CCCD nổi rõ.
const VIEWER_BACKGROUND = '#000000';
const ON_VIEWER = '#FFFFFF';
const ON_VIEWER_MUTED = 'rgba(255, 255, 255, 0.72)';
const VIEWER_CONTROL = 'rgba(255, 255, 255, 0.16)';
// Nút chuyển ảnh nằm đè lên ảnh (ảnh CCCD thường nền sáng): nền tối mờ và viền sáng để thấy rõ trên mọi ảnh.
const NAV_BACKGROUND = 'rgba(0, 0, 0, 0.55)';
const NAV_BORDER = 'rgba(255, 255, 255, 0.35)';
const VIEWER_ERROR = '#FCA5A5';

export interface ViewerPhoto {
  url: string;
  label: string;
  image: DocumentImage;
}

interface Props {
  photos: ViewerPhoto[];
  /** Ảnh đang xem; null là đóng. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onRetry: (url: string) => void;
}

/**
 * Xem lớn ảnh hồ sơ, toàn màn hình, chuyển qua lại giữa các ảnh. iOS chụm hai ngón để phóng to thêm; web dùng phím
 * mũi tên trái/phải để chuyển ảnh, Esc để đóng.
 */
export default function PhotoViewer({ photos, index, onIndexChange, onClose, onRetry }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const position = index ?? 0;
  const current = index === null ? null : (photos[index] ?? null);
  const total = photos.length;
  const visible = current !== null;

  const go = (delta: number) => {
    if (total > 0) onIndexChange((position + delta + total) % total);
  };

  // Web: phím mũi tên chuyển ảnh (Esc đóng Modal đã có sẵn trong react-native-web).
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || total < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onIndexChange((position - 1 + total) % total);
      if (event.key === 'ArrowRight') onIndexChange((position + 1) % total);
    };
    document.addEventListener('keyup', onKey);
    return () => document.removeEventListener('keyup', onKey);
  }, [visible, position, total, onIndexChange]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {current && (
          <>
            <View style={styles.topBar}>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
                  {current.label}
                </Text>
                <Text style={styles.counter}>{t('admin.photos.counter', { current: position + 1, total })}</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('admin.photos.close')}
                style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
                <SymbolView name={AdminIcons.close} size={IconSize.xl} tintColor={ON_VIEWER} />
              </Pressable>
            </View>

            <View style={styles.stage}>
              {current.image.status === 'ready' && (
                <ScrollView
                  style={styles.zoom}
                  contentContainerStyle={styles.zoomContent}
                  maximumZoomScale={4}
                  minimumZoomScale={1}
                  centerContent
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}>
                  {/* cachePolicy "none": không lưu ảnh hồ sơ vào bộ nhớ đệm hay ổ đĩa của máy. */}
                  <Image
                    source={{ uri: current.image.uri }}
                    style={styles.image}
                    contentFit="contain"
                    cachePolicy="none"
                    accessibilityLabel={current.label}
                  />
                </ScrollView>
              )}
              {current.image.status === 'loading' && <ActivityIndicator color={ON_VIEWER} size="large" />}
              {current.image.status === 'error' && (
                <View style={styles.failed}>
                  <SymbolView name={AdminIcons.photoError} size={IconSize.hero} tintColor={VIEWER_ERROR} />
                  <Text style={styles.failedText}>{t('admin.photos.loadFailed')}</Text>
                  <Pressable
                    onPress={() => onRetry(current.url)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                    <Text style={styles.retryText}>{t('admin.photos.retry')}</Text>
                  </Pressable>
                </View>
              )}

              {total > 1 && (
                <>
                  <Pressable
                    onPress={() => go(-1)}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.photos.previous')}
                    style={({ pressed }) => [styles.control, styles.nav, styles.navLeft, pressed && styles.pressed]}>
                    <SymbolView name={AdminIcons.previous} size={IconSize.xl} tintColor={ON_VIEWER} />
                  </Pressable>
                  <Pressable
                    onPress={() => go(1)}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.photos.next')}
                    style={({ pressed }) => [styles.control, styles.nav, styles.navRight, pressed && styles.pressed]}>
                    <SymbolView name={AdminIcons.next} size={IconSize.xl} tintColor={ON_VIEWER} />
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: VIEWER_BACKGROUND },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { ...Typography.heading, color: ON_VIEWER },
  counter: { ...Typography.caption, color: ON_VIEWER_MUTED },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: VIEWER_CONTROL,
  },
  pressed: { opacity: 0.6 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoom: { alignSelf: 'stretch', flex: 1 },
  zoomContent: { flexGrow: 1 },
  image: { flex: 1, width: '100%', minHeight: 200 },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    backgroundColor: NAV_BACKGROUND,
    borderWidth: 1,
    borderColor: NAV_BORDER,
  },
  navLeft: { left: Spacing.three },
  navRight: { right: Spacing.three },
  failed: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  failedText: { ...Typography.body, color: ON_VIEWER },
  retry: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: VIEWER_CONTROL,
  },
  retryText: { ...Typography.bodyStrong, color: ON_VIEWER },
});
