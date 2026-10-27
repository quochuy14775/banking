import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommonIcons, NotificationIcons } from '@/constants/icons';
import { Fonts, Spacing, type ThemeColors } from '@/constants/theme';
import {
  formatBadgeCount,
  formatSignedVND,
  formatTime,
  formatVND,
  groupByDay,
  type DayGroup,
} from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useNotifications } from '@/lib/notificationStore';
import type {
  AppNotification,
  NotificationCategory,
  NotificationTransaction,
  NotificationType,
} from '@/models';

const CARD_MARGIN = Spacing.three;
const SEGMENT_PADDING = 3;

const TABS: NotificationCategory[] = ['balance', 'promotion', 'system'];

type ColorKey = keyof ThemeColors;

const TAG_COLORS: Record<NotificationType, { bg: ColorKey; fg: ColorKey }> = {
  balance_in: { bg: 'successSoft', fg: 'success' },
  balance_out: { bg: 'dangerSoft', fg: 'danger' },
  promotion: { bg: 'promoSoft', fg: 'promo' },
  bill: { bg: 'warningSoft', fg: 'warning' },
  goal: { bg: 'successSoft', fg: 'success' },
  security: { bg: 'infoSoft', fg: 'info' },
  system: { bg: 'primarySoft', fg: 'onPrimarySoft' },
};

type Styles = ReturnType<typeof createStyles>;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [tab, setTab] = useState<NotificationCategory>('balance');

  const tabLabel = t(`notifications.tabs.${tab}`);
  const tabItems = items.filter((n) => n.category === tab);
  const tabUnread = tabItems.filter((n) => !n.read).length;
  const unreadByTab = TABS.map((key) => items.filter((n) => n.category === key && !n.read).length);
  const sections = groupByDay(tabItems, (n) => n.createdAt, {
    today: t('common.today'),
    yesterday: t('common.yesterday'),
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.root}>
        {Platform.OS === 'ios' && <View style={styles.grabber} />}

        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.title}>{t('notifications.title')}</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0
                ? t('notifications.unreadSubtitle', { count: unreadCount })
                : t('notifications.allRead')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {tabUnread > 0 && (
              <Pressable
                onPress={() => void markAllAsRead(tab)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('notifications.markAllReadTab', { tab: tabLabel })}
                style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}>
                <SymbolView
                  name={NotificationIcons.markAllRead}
                  size={15}
                  tintColor={theme.onPrimarySoft}
                />
                <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <SymbolView
                name={CommonIcons.close}
                size={13}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        <Segmented value={tab} onChange={setTab} counts={unreadByTab} styles={styles} />

        <SectionList<AppNotification, DayGroup<AppNotification>>
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.transaction ? (
              <BalanceCard
                item={item}
                tx={item.transaction}
                styles={styles}
                onPress={() => void markAsRead(item.id)}
              />
            ) : (
              <InfoCard
                item={item}
                styles={styles}
                theme={theme}
                onPress={() => void markAsRead(item.id)}
              />
            )
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          ListEmptyComponent={
            <EmptyState text={t(`notifications.empty.${tab}`)} styles={styles} color={theme.textMuted} />
          }
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.four }}
        />
      </View>
    </Modal>
  );
}

interface SegmentedProps {
  value: NotificationCategory;
  onChange: (value: NotificationCategory) => void;
  counts: number[];
  styles: Styles;
}

function Segmented({ value, onChange, counts, styles }: SegmentedProps) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const index = TABS.indexOf(value);
  const segmentWidth = width > 0 ? (width - SEGMENT_PADDING * 2) / TABS.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(withTiming(index * segmentWidth, { duration: 220 }));
  }, [index, segmentWidth, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <View
      style={styles.segmented}
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {segmentWidth > 0 && (
        <Animated.View style={[styles.indicator, { width: segmentWidth }, indicatorStyle]} />
      )}
      {TABS.map((key, i) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segment}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {t(`notifications.tabs.${key}`)}
            </Text>
            {counts[i] > 0 && (
              <View style={[styles.count, active && styles.countActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>
                  {formatBadgeCount(counts[i])}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

interface CardProps {
  item: AppNotification;
  styles: Styles;
  onPress: () => void;
  accessibilityLabel: string;
  head: ReactNode;
  children: ReactNode;
}

function Card({ item, styles, onPress, accessibilityLabel, head, children }: CardProps) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : t('notifications.unreadPrefix')}${accessibilityLabel}`}
      style={({ pressed }) => [styles.card, !item.read && styles.cardUnread, pressed && styles.cardPressed]}>
      <View style={styles.cardHead}>
        {head}
        <View style={styles.flex} />
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        {!item.read && <View style={styles.dot} />}
      </View>
      {children}
    </Pressable>
  );
}

function BalanceCard({
  item,
  tx,
  styles,
  onPress,
}: {
  item: AppNotification;
  tx: NotificationTransaction;
  styles: Styles;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const isIn = tx.type === 'in';
  const amount = formatSignedVND(tx.amount, tx.type);
  const balance = formatVND(tx.balanceAfter);
  const counterpartyMeta = [tx.counterpartyBank, tx.counterpartyAccount].filter(Boolean).join(' · ');
  const partyLabel = t(isIn ? 'notifications.transaction.sender' : 'notifications.transaction.recipient');
  const accountLabel = t(isIn ? 'notifications.transaction.accountIn' : 'notifications.transaction.accountOut');
  const contentLabel = t('notifications.transaction.content');
  const balanceLabel = t('notifications.transaction.balance');

  return (
    <Card
      item={item}
      styles={styles}
      onPress={onPress}
      accessibilityLabel={`${amount}. ${partyLabel} ${tx.counterpartyName}. ${accountLabel} ${tx.accountNumber}. ${contentLabel} ${tx.description}. ${balanceLabel} ${balance}`}
      head={<Text style={[styles.amount, isIn ? styles.amountIn : styles.amountOut]}>{amount}</Text>}>
      <InfoRow label={partyLabel} styles={styles}>
        <Text style={[styles.value, styles.valueStrong]}>{tx.counterpartyName}</Text>
        {counterpartyMeta !== '' && <Text style={styles.valueMeta}>{counterpartyMeta}</Text>}
      </InfoRow>
      <InfoRow label={accountLabel} styles={styles}>
        <Text style={[styles.value, styles.mono]}>{tx.accountNumber}</Text>
      </InfoRow>
      <InfoRow label={contentLabel} styles={styles}>
        <Text style={styles.value}>{tx.description}</Text>
      </InfoRow>
      <View style={styles.divider} />
      <InfoRow label={balanceLabel} styles={styles}>
        <Text style={[styles.value, styles.valueStrong]}>{balance}</Text>
      </InfoRow>
    </Card>
  );
}

function InfoCard({
  item,
  styles,
  theme,
  onPress,
}: {
  item: AppNotification;
  styles: Styles;
  theme: ThemeColors;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const colors = TAG_COLORS[item.type];
  const tagLabel = t(`notifications.tags.${item.type}`);
  return (
    <Card
      item={item}
      styles={styles}
      onPress={onPress}
      accessibilityLabel={`${tagLabel}. ${item.title}. ${item.message}`}
      head={
        <View style={[styles.tag, { backgroundColor: theme[colors.bg] }]}>
          <Text style={[styles.tagText, { color: theme[colors.fg] }]}>{tagLabel}</Text>
        </View>
      }>
      <Text style={[styles.infoTitle, item.read ? styles.infoTitleRead : styles.infoTitleUnread]}>
        {item.title}
      </Text>
      <Text style={styles.infoMessage}>{item.message}</Text>
    </Card>
  );
}

function InfoRow({ label, styles, children }: { label: string; styles: Styles; children: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <View style={styles.kvValue}>{children}</View>
    </View>
  );
}

function EmptyState({ text, styles, color }: { text: string; styles: Styles; color: string }) {
  return (
    <View style={styles.empty}>
      <SymbolView
        name={NotificationIcons.empty}
        size={32}
        tintColor={color}
      />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    flex: { flex: 1 },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 5,
      borderRadius: 3,
      marginTop: Spacing.two,
      backgroundColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: CARD_MARGIN,
      paddingTop: Spacing.three,
      paddingBottom: Spacing.two,
    },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: theme.text },
    subtitle: { fontSize: 13, lineHeight: 18, marginTop: 2, color: theme.textSecondary },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    markAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 32,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: theme.primarySoft,
    },
    markAllText: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: theme.onPrimarySoft },
    close: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundSelected,
    },
    pressed: { opacity: 0.6 },
    segmented: {
      flexDirection: 'row',
      height: 40,
      marginHorizontal: CARD_MARGIN,
      marginBottom: Spacing.one,
      padding: SEGMENT_PADDING,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
    },
    indicator: {
      position: 'absolute',
      top: SEGMENT_PADDING,
      bottom: SEGMENT_PADDING,
      left: SEGMENT_PADDING,
      borderRadius: 9,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    segmentText: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: theme.textSecondary },
    segmentTextActive: { fontWeight: '700', color: theme.text },
    count: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundSelected,
    },
    countActive: { backgroundColor: theme.notify },
    countText: { fontSize: 10, lineHeight: 12, fontWeight: '700', color: theme.textSecondary },
    countTextActive: { color: theme.onNotify },
    sectionHeader: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: theme.textSecondary,
      paddingHorizontal: CARD_MARGIN + 2,
      paddingTop: Spacing.three,
      paddingBottom: Spacing.two,
      backgroundColor: theme.backgroundMuted,
    },
    card: {
      marginHorizontal: CARD_MARGIN,
      marginBottom: 10,
      paddingHorizontal: Spacing.three,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    cardUnread: { borderWidth: 1, borderColor: theme.borderAccent },
    cardPressed: { transform: [{ scale: 0.985 }] },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    time: { fontSize: 12, lineHeight: 16, color: theme.textMuted },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.notify },
    amount: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
    amountIn: { color: theme.success },
    amountOut: { color: theme.danger },
    kv: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, marginTop: 6 },
    kvLabel: { fontSize: 13, lineHeight: 18, color: theme.textMuted },
    kvValue: { flex: 1, alignItems: 'flex-end' },
    value: { fontSize: 13, lineHeight: 18, color: theme.text, textAlign: 'right' },
    valueStrong: { fontWeight: '600' },
    valueMeta: { fontSize: 12, lineHeight: 16, color: theme.textMuted, textAlign: 'right' },
    mono: { fontFamily: Fonts.mono, letterSpacing: 0.5 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginTop: 10,
      marginBottom: 2,
    },
    tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    tagText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
    infoTitle: { fontSize: 16, lineHeight: 21, marginTop: Spacing.two },
    infoTitleUnread: { fontWeight: '700', color: theme.text },
    infoTitleRead: { fontWeight: '500', color: theme.text },
    infoMessage: { fontSize: 13, lineHeight: 18, marginTop: 3, color: theme.textSecondary },
    empty: { alignItems: 'center', gap: Spacing.two, paddingTop: 80 },
    emptyText: { fontSize: 14, color: theme.textMuted },
  });
}
