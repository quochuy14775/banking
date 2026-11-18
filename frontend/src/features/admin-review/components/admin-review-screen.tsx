import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminIcons } from '@/constants/icons';
import { IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/store/authStore';
import { useI18n } from '@/i18n';
import type { ApplicationStatus } from '@/models';
import AppLogo from '@/shared/components/app-logo';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

import { REVIEW_STATUSES } from '../review-text';
import ApplicationDetailView from './application-detail';
import ApplicationList from './application-list';
import ConfirmDialog from './confirm-dialog';

// Từ bề rộng này (máy tính bảng, trình duyệt máy tính) danh sách và chi tiết nằm cạnh nhau.
const SPLIT_MIN_WIDTH = 900;
const LIST_PANE_WIDTH = 400;
const NO_IDS: ReadonlySet<string> = new Set();

/**
 * Màn của nhân viên (vai trò ADMIN): duyệt hồ sơ đăng ký mở tài khoản. Thay cho các tab của khách sau khi đăng nhập.
 * Danh sách theo trạng thái (Chờ duyệt / Đã duyệt / Từ chối); chọn một hồ sơ để xem chi tiết, ảnh và duyệt hoặc từ chối.
 */
export default function AdminReviewScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { staff, logout } = useAuth();
  const { width } = useWindowDimensions();
  const split = width >= SPLIT_MIN_WIDTH;

  const [status, setStatus] = useState<ApplicationStatus>('PENDING_REVIEW');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Hồ sơ đã rời trạng thái chờ duyệt trong phiên này: tab Chờ duyệt ẩn đi mà không cần tải lại.
  const [reviewedIds, setReviewedIds] = useState<ReadonlySet<string>>(NO_IDS);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const showingDetail = !split && selectedId !== null;

  // Nút Back của Android: đang xem chi tiết ở màn hẹp thì về danh sách.
  useEffect(() => {
    if (!showingDetail) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null);
      return true;
    });
    return () => subscription.remove();
  }, [showingDetail]);

  const selectStatus = (next: ApplicationStatus) => {
    if (next === status) return;
    setStatus(next);
    setSelectedId(null);
  };

  const markReviewed = (id: string) => setReviewedIds((prev) => new Set(prev).add(id));

  const signOut = async () => {
    setLoggingOut(true);
    await logout();
  };

  const detail = selectedId ? (
    <ApplicationDetailView
      key={selectedId}
      applicationId={selectedId}
      onBack={split ? undefined : () => setSelectedId(null)}
      onReviewed={markReviewed}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Màn hẹp đang xem chi tiết: ẩn (không gỡ) đầu trang và danh sách để giữ vị trí cuộn, các trang đã tải. */}
      <View style={[styles.header, showingDetail && styles.hidden]}>
        <AppLogo size={36} />
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {t('admin.title')}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t('admin.staff', { name: staff?.username ?? '' })}
          </Text>
        </View>
        <Pressable
          onPress={() => setConfirmLogout(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('admin.logout')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={AdminIcons.logout} size={IconSize.lg} tintColor={theme.danger} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={[split ? styles.listPane : styles.flex, showingDetail && styles.hidden]}>
          <View style={styles.tabs} role="tablist">
            {REVIEW_STATUSES.map((item) => {
              const active = item === status;
              return (
                <Pressable
                  key={item}
                  onPress={() => selectStatus(item)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && !active && styles.pressed]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                    {t(`admin.tabs.${item}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ApplicationList
            key={status}
            status={status}
            hiddenIds={status === 'PENDING_REVIEW' ? reviewedIds : NO_IDS}
            selectedId={split ? selectedId : null}
            onSelect={setSelectedId}
          />
        </View>

        {split ? (
          <View style={styles.detailPane}>
            {detail ?? (
              <View style={styles.placeholder}>
                <SymbolView name={AdminIcons.idCard} size={IconSize.badge} tintColor={theme.textMuted} />
                <Text style={styles.placeholderText}>{t('admin.list.selectHint')}</Text>
              </View>
            )}
          </View>
        ) : (
          detail
        )}
      </View>

      <ConfirmDialog
        visible={confirmLogout}
        title={t('admin.logout')}
        message={t('admin.logoutConfirm')}
        confirmLabel={t('admin.logout')}
        destructive
        loading={loggingOut}
        onConfirm={signOut}
        onCancel={() => setConfirmLogout(false)}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    flex: { flex: 1 },
    hidden: { display: 'none' },
    pressed: { opacity: 0.7 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: 12,
      backgroundColor: theme.backgroundElement,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: { ...Typography.heading, color: theme.text },
    subtitle: { ...Typography.caption, color: theme.textSecondary },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.dangerSoft,
    },
    body: { flex: 1, flexDirection: 'row' },
    listPane: {
      width: LIST_PANE_WIDTH,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.border,
    },
    detailPane: { flex: 1 },
    tabs: {
      flexDirection: 'row',
      gap: Spacing.one,
      marginHorizontal: Spacing.three,
      marginTop: 12,
      padding: Spacing.one,
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    tab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, paddingHorizontal: Spacing.one },
    tabActive: { backgroundColor: theme.primary },
    tabText: { ...Typography.callout, fontWeight: '600', color: theme.textSecondary },
    tabTextActive: { color: theme.onPrimary },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
    placeholderText: { ...Typography.callout, color: theme.textSecondary, textAlign: 'center' },
  });
}
