import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminIcons } from '@/constants/icons';
import { Fonts, IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { formatDate, formatDateTime } from '@/helpers';
import { useI18n } from '@/i18n';
import type { ApplicationStatus, ApplicationSummary, ReviewError } from '@/models';
import { listApplications, REVIEW_PAGE_SIZE } from '@/services/admin-review.service';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';

import { useReviewApi } from '../hooks/use-review-api';
import { reviewErrorText } from '../review-text';

interface Props {
  status: ApplicationStatus;
  /** Hồ sơ vừa duyệt hoặc từ chối ở màn chi tiết: ẩn khỏi danh sách mà không cần tải lại. */
  hiddenIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Cũ nhất trước, như thứ tự backend trả về; gộp nhiều trang thì sắp lại cho chắc.
function oldestFirst(items: ApplicationSummary[]): ApplicationSummary[] {
  return [...items].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
}

/**
 * Danh sách hồ sơ của một trạng thái, cũ nhất trước. Kéo xuống để làm mới (trên máy) hoặc bấm nút tải lại (web không có
 * cử chỉ kéo); cuộn tới cuối thì tải thêm trang sau. Gắn `key` theo trạng thái để đổi tab là tải lại từ đầu.
 */
export default function ApplicationList({ status, hiddenIds, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const run = useReviewApi();

  const [items, setItems] = useState<ApplicationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<ReviewError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Lần tải thêm gần nhất không có hồ sơ mới (danh sách vừa đổi trên máy chủ): thôi tải thêm cho tới khi làm mới.
  const [exhausted, setExhausted] = useState(false);

  const visible = items.filter((item) => !hiddenIds.has(item.id));
  // Hồ sơ đã ẩn cũng không còn trong trạng thái này trên máy chủ: trừ khỏi tổng số.
  const visibleTotal = Math.max(visible.length, total - (items.length - visible.length));
  const hasMore = loaded && !exhausted && visible.length < visibleTotal;

  // Trang đầu khi mở tab.
  useEffect(() => {
    let active = true;
    run((accessToken) => listApplications(accessToken, status, 0)).then((res) => {
      if (!active) return;
      if (res.ok) {
        setItems(res.data.items);
        setTotal(res.data.totalElements);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [run, status]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const res = await run((accessToken) => listApplications(accessToken, status, 0));
    setRefreshing(false);
    setLoaded(true);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setItems(res.data.items);
    setTotal(res.data.totalElements);
    setError(null);
    setExhausted(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || refreshing) return;
    setLoadingMore(true);
    // Hồ sơ đã duyệt/từ chối rời khỏi trạng thái này nên vị trí trên máy chủ dịch lên: tính trang theo số hồ sơ còn
    // hiện, tải lại trang có thể trùng vài hồ sơ (bỏ trùng bên dưới) nhưng không bỏ sót hồ sơ nào.
    const page = Math.floor(visible.length / REVIEW_PAGE_SIZE);
    const res = await run((accessToken) => listApplications(accessToken, status, page));
    setLoadingMore(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setTotal(res.data.totalElements);
    const known = new Set(items.map((item) => item.id));
    const fresh = res.data.items.filter((item) => !known.has(item.id));
    if (fresh.length === 0) {
      setExhausted(true);
      return;
    }
    setItems((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      return oldestFirst([...prev, ...fresh.filter((item) => !ids.has(item.id))]);
    });
  };

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.muted}>{t('admin.list.loading')}</Text>
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.count}>{t('admin.list.count', { count: visibleTotal })}</Text>
        <Pressable
          onPress={refresh}
          disabled={refreshing}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('admin.refresh')}
          accessibilityState={{ busy: refreshing }}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <SymbolView name={AdminIcons.refresh} size={IconSize.lg} tintColor={theme.primary} />
          )}
        </Pressable>
      </View>
      {error && error !== 'sessionExpired' ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} accessibilityLiveRegion="polite" role="alert">
            {reviewErrorText(t, error)}
          </Text>
          <Pressable onPress={refresh} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{t('admin.detail.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ApplicationRow item={item} selected={item.id === selectedId} onPress={() => onSelect(item.id)} />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        error ? undefined : (
          <View style={styles.empty}>
            <SymbolView name={AdminIcons.empty} size={IconSize.badge} tintColor={theme.textMuted} />
            <Text style={styles.muted}>{t(`admin.list.empty.${status}`)}</Text>
          </View>
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={styles.footer} color={theme.primary} />
        ) : hasMore ? (
          <Pressable onPress={loadMore} accessibilityRole="button" style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Text style={styles.link}>{t('admin.list.loadMore')}</Text>
          </Pressable>
        ) : undefined
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshing={refreshing}
      onRefresh={refresh}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
    />
  );
}

function Separator() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.separator} />;
}

function ApplicationRow({
  item,
  selected,
  onPress,
}: {
  item: ApplicationSummary;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('admin.list.open', { name: item.fullName })}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <SymbolView name={AdminIcons.idCard} size={IconSize.xl} tintColor={theme.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {item.fullName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.mono}>{t('admin.list.idNumber', { id: item.nationalId })}</Text>
          {'  ·  '}
          {t('admin.list.born', { date: formatDate(item.dateOfBirth) })}
        </Text>
        <Text style={styles.time}>{formatDateTime(item.submittedAt)}</Text>
      </View>
      <SymbolView name={AdminIcons.next} size={IconSize.md} tintColor={theme.textMuted} />
    </Pressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, flexGrow: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
    muted: { ...Typography.callout, color: theme.textSecondary, textAlign: 'center' },
    header: { gap: Spacing.two, paddingTop: Spacing.two, paddingBottom: Spacing.two },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
    count: { ...Typography.callout, color: theme.textSecondary, flex: 1 },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    pressed: { opacity: 0.7 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      padding: 12,
      borderRadius: Radius.md,
      backgroundColor: theme.dangerSoft,
    },
    errorText: { ...Typography.callout, flex: 1, color: theme.danger },
    link: { ...Typography.callout, color: theme.primary, fontWeight: '700' },
    empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six, paddingHorizontal: Spacing.four },
    footer: { paddingVertical: Spacing.three },
    more: { alignItems: 'center', paddingVertical: Spacing.three },
    separator: { height: Spacing.two },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowSelected: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
    },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    name: { ...Typography.bodyStrong, color: theme.text },
    meta: { ...Typography.caption, color: theme.textSecondary },
    mono: { fontFamily: Fonts.mono },
    time: { ...Typography.caption, color: theme.textMuted },
  });
}
