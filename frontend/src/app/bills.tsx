import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import BillCategoryIcon from '@/features/bills/components/bill-category-icon';
import BillPaySheet, { type BillPayItem, type BillSheetMode } from '@/features/bills/components/bill-pay-sheet';
import { BillCategoryColors, type BillTileCategory } from '@/features/bills/bill-colors';
import { BillIcons, TransferIcons } from '@/constants/icons';
import { MoneyText, Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { daysUntil, formatDayMonth, formatVND, parseISODate, upcomingDays, weekdayKey } from '@/helpers';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';
import type { BillHistoryItem, BillProvider, SavedBill } from '@/models';
import { getBillHistory, getBillProviders, getSavedBills } from '@/services/bill.service';

const NEW_BILL_TILES: BillTileCategory[] = ['electricity', 'water', 'internet', 'tv', 'mobile', 'tuition', 'insurance', 'other'];
const WEEK_DAYS = 7;
const DUE_SOON_DAYS = 3;
const RECENT_LIMIT = 5;
// Hiệu ứng chạy một lần, chậm dần về cuối, không nảy.
const EASE_OUT = Easing.out(Easing.cubic);
// Ngày hôm nay trong lịch tuần: vòng trắng chữ màu thẻ, nằm trên thẻ xanh đậm.

interface Outstanding extends BillPayItem {
  provider: BillProvider;
}

export default function BillsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? 'dark' : 'light';

  const [providers, setProviders] = useState<BillProvider[]>([]);
  const [saved, setSaved] = useState<SavedBill[]>([]);
  const [history, setHistory] = useState<BillHistoryItem[]>([]);
  const [sheet, setSheet] = useState<BillSheetMode | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const heroBottom = useSharedValue(320);
  // Vị trí các khối trong nội dung cuộn, để bấm lịch/lịch sử thì cuộn tới đúng chỗ.
  const timelineY = useRef(0);
  const groupY = useRef<Record<string, number>>({});
  const recentY = useRef(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBillProviders(), getSavedBills({ userId: user.id }), getBillHistory({ userId: user.id })]).then(
      ([p, s, h]) => {
        if (!active) return;
        if (p.success) setProviders(p.items);
        if (s.success) setSaved(s.items);
        if (h.success) setHistory(h.items);
      },
    );
    return () => {
      active = false;
    };
  }, [user]);

  const reload = () => {
    if (!user) return;
    Promise.all([getSavedBills({ userId: user.id }), getBillHistory({ userId: user.id })]).then(([s, h]) => {
      if (s.success) setSaved(s.items);
      if (h.success) setHistory(h.items);
    });
  };

  const providerById = (id: string) => providers.find((p) => p.id === id);
  const outstanding: Outstanding[] = saved
    .flatMap((s) => {
      const provider = providerById(s.providerId);
      return s.bill && provider ? [{ bill: s.bill, label: s.label, provider }] : [];
    })
    .sort((a, b) => a.bill.dueDate.localeCompare(b.bill.dueDate));
  const total = outstanding.reduce((sum, o) => sum + o.bill.amount, 0);
  const groups = outstanding.reduce<{ date: string; items: Outstanding[] }[]>((acc, o) => {
    const last = acc[acc.length - 1];
    if (last && last.date === o.bill.dueDate) last.items.push(o);
    else acc.push({ date: o.bill.dueDate, items: [o] });
    return acc;
  }, []);
  const week = upcomingDays(WEEK_DAYS).map((iso) => ({ iso, items: outstanding.filter((o) => o.bill.dueDate === iso) }));
  const nearest = outstanding[0];

  const nearestText = (() => {
    if (!nearest) return t('bills.hero.none');
    const days = daysUntil(nearest.bill.dueDate);
    if (days < 0) return t('bills.hero.nearestOverdue', { name: nearest.label });
    if (days === 0) return t('bills.hero.nearestToday', { name: nearest.label });
    return t('bills.hero.nearest', { name: nearest.label, days });
  })();

  const duePhrase = (iso: string) => {
    const days = daysUntil(iso);
    if (days < 0) return { text: t('bills.overdue'), color: theme.danger };
    if (days === 0) return { text: t('bills.dueToday'), color: theme.danger };
    return { text: t('bills.dueIn', { count: days }), color: days <= DUE_SOON_DAYS ? theme.warning : theme.textMuted };
  };

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  // Thẻ xanh cuộn khuất thì hiện thanh "Cần trả" gọn trên header.
  const compactStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollY.get(), [heroBottom.get() - 90, heroBottom.get() - 30], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * 6 }] };
  });

  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - Spacing.three), animated: true });

  const openNew = (category: BillTileCategory) => {
    if (category === 'other') {
      Alert.alert(t('bills.categories.other'), t('common.comingSoon'));
      return;
    }
    setSheet({ kind: 'new', category });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.navigate('/')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('transfer.back')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={theme.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('bills.title')}
        </Text>
        <Animated.View style={[styles.compact, compactStyle]} pointerEvents="none">
          <Text style={styles.compactText}>{t('bills.compact', { amount: formatVND(total) })}</Text>
        </Animated.View>
        <Pressable
          onPress={() => scrollTo(recentY.current)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('bills.history')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={BillIcons.history} size={IconSize.lg} tintColor={theme.text} />
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}>
        <View
          style={styles.heroShadow}
          onLayout={(e) => heroBottom.set(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <LinearGradient
            colors={[theme.hero, theme.heroElement]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}>
            <View style={styles.heroCircle} pointerEvents="none" />
            <View style={styles.rowBetween}>
              <Text style={styles.heroLabel}>{t('bills.hero.label')}</Text>
              {outstanding.length > 0 && (
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{t('bills.hero.count', { count: outstanding.length })}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroAmount}>{formatVND(total)}</Text>
            <Text style={styles.heroSub}>{nearestText}</Text>

            {/* Lịch tuần: hôm nay là vòng trắng, ngày có hóa đơn có chấm màu theo loại dịch vụ. */}
            <View style={styles.week}>
              {week.map((d, i) => {
                const has = d.items.length > 0;
                const isToday = i === 0;
                const selected = d.iso === selectedDay;
                const dot = has ? BillCategoryColors[d.items[0].provider.category].dark.fg : 'transparent';
                return (
                  <Pressable
                    key={d.iso}
                    disabled={!has}
                    onPress={() => {
                      setSelectedDay(d.iso);
                      scrollTo(timelineY.current + (groupY.current[d.iso] ?? 0));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !has, selected }}
                    accessibilityLabel={`${t(`bills.weekdaysLong.${weekdayKey(d.iso)}`)} ${formatDayMonth(d.iso)}`}
                    style={styles.day}>
                    <Text style={styles.dayName}>{t(`bills.weekdays.${weekdayKey(d.iso)}`)}</Text>
                    <View style={[styles.dayNumberWrap, isToday && styles.dayToday, selected && !isToday && styles.daySelected]}>
                      <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                        {parseISODate(d.iso).getDate()}
                      </Text>
                    </View>
                    <View style={[styles.dayDot, { backgroundColor: dot }]} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.heroActions}>
              <Pressable
                onPress={() => setSheet({ kind: 'pay', items: outstanding })}
                disabled={outstanding.length === 0}
                accessibilityRole="button"
                accessibilityState={{ disabled: outstanding.length === 0 }}
                style={({ pressed }) => [styles.payAll, (pressed || outstanding.length === 0) && styles.pressed]}>
                <Text style={styles.payAllText}>{t('bills.hero.payAll')}</Text>
              </Pressable>
              <Pressable
                onPress={() => Alert.alert(t('bills.hero.autoPay'), t('common.comingSoon'))}
                accessibilityRole="button"
                accessibilityLabel={t('bills.hero.autoPay')}
                style={({ pressed }) => [styles.autoPay, pressed && styles.pressed]}>
                <SymbolView name={BillIcons.autoPay} size={IconSize.xl} tintColor="#FFFFFF" />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>{t('bills.schedule')}</Text>
        {groups.length === 0 ? (
          <Text style={styles.empty}>{t('bills.scheduleEmpty')}</Text>
        ) : (
          <View style={styles.timeline} onLayout={(e) => (timelineY.current = e.nativeEvent.layout.y)}>
            <View style={styles.timelineLine} />
            {groups.map((g, gi) => {
              const phrase = duePhrase(g.date);
              return (
                <View key={g.date} style={styles.group} onLayout={(e) => (groupY.current[g.date] = e.nativeEvent.layout.y)}>
                  <View style={styles.groupHeader}>
                    <TimelineNode
                      color={BillCategoryColors[g.items[0].provider.category][palette].dot}
                      breathing={gi === 0}
                    />
                    <Text style={styles.groupTitle}>
                      {`${t(`bills.weekdaysLong.${weekdayKey(g.date)}`)} ${formatDayMonth(g.date)} `}
                      <Text style={{ color: phrase.color }}>· {phrase.text}</Text>
                    </Text>
                  </View>
                  {g.items.map((o, ii) => {
                    const primary = gi === 0 && ii === 0;
                    return (
                      <Animated.View
                        key={o.bill.id}
                        entering={FadeInDown.duration(320).delay(60 * (gi + ii)).easing(EASE_OUT)}
                        style={[styles.billCard, selectedDay === g.date && styles.billCardSelected]}>
                        <BillCategoryIcon category={o.provider.category} />
                        <View style={styles.flex}>
                          <Text style={styles.billTitle} numberOfLines={1}>
                            {o.label}
                          </Text>
                          <Text style={styles.billSub} numberOfLines={1}>
                            {o.provider.shortName} · <Text style={styles.money}>{formatVND(o.bill.amount)}</Text>
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setSheet({ kind: 'pay', items: [o] })}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('bills.payNow')} ${o.label}`}
                          style={({ pressed }) => [
                            styles.payPill,
                            primary ? styles.payPillPrimary : styles.payPillSoft,
                            pressed && styles.pressed,
                          ]}>
                          <Text style={[styles.payPillText, primary ? styles.payPillTextPrimary : styles.payPillTextSoft]}>
                            {t('bills.payNow')}
                          </Text>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('bills.newBill')}</Text>
        <View style={styles.tiles}>
          {NEW_BILL_TILES.map((c) => (
            <Pressable
              key={c}
              onPress={() => openNew(c)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <BillCategoryIcon category={c} size={52} />
              <Text style={styles.tileLabel} numberOfLines={1}>
                {t(`bills.categories.${c}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View onLayout={(e) => (recentY.current = e.nativeEvent.layout.y)}>
          <Text style={styles.sectionTitle}>{t('bills.recent')}</Text>
        </View>
        {history.length === 0 ? (
          <Text style={styles.empty}>{t('bills.recentEmpty')}</Text>
        ) : (
          <View style={styles.card}>
            {history.slice(0, RECENT_LIMIT).map((h, i) => (
              <View key={h.id} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                <BillCategoryIcon category={providerById(h.providerId)?.category ?? 'other'} size={40} />
                <View style={styles.flex}>
                  <Text style={styles.billTitle} numberOfLines={1}>
                    {h.label}
                  </Text>
                  <Text style={styles.billSub}>
                    {formatDayMonth(h.paidAt)} · <Text style={styles.money}>{formatVND(h.amount)}</Text>
                  </Text>
                </View>
                <View style={styles.paidChip}>
                  <Text style={styles.paidChipText}>{t('bills.paidChip')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <BillPaySheet mode={sheet} providers={providers} onClose={() => setSheet(null)} onPaid={reload} />
    </SafeAreaView>
  );
}

// Nút trên dòng thời gian; hóa đơn gần hạn nhất có vòng sáng "thở" nhẹ.
function TimelineNode({ color, breathing }: { color: string; breathing: boolean }) {
  const styles = useThemedStyles(createStyles);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!breathing) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [breathing, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.get(), [0, 1], [0.15, 0.45]),
    transform: [{ scale: interpolate(pulse.get(), [0, 1], [1, 1.9]) }],
  }));

  return (
    <View style={styles.nodeWrap}>
      {breathing && <Animated.View style={[styles.nodeRing, { backgroundColor: color }, ringStyle]} />}
      <View style={[styles.node, { backgroundColor: color }]} />
    </View>
  );
}

const NODE = 18;

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    flex: { flex: 1 },
    pressed: { opacity: 0.7 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...Typography.title, color: theme.text, flex: 1 },
    compact: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: theme.primarySoft,
    },
    compactText: { ...Typography.caption, color: theme.onPrimarySoft, fontWeight: '700' },
    content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.six },
    heroShadow: { borderRadius: 28, boxShadow: theme.cardShadow },
    hero: { borderRadius: 28, padding: 20, overflow: 'hidden' },
    heroCircle: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      top: -90,
      right: -70,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    heroLabel: { ...Typography.callout, color: theme.onHeroMuted },
    heroChip: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: Radius.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    heroChipText: { ...Typography.micro, color: theme.onHero, fontWeight: '700' },
    money: MoneyText,
    heroAmount: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: theme.onHero, marginTop: 6, ...MoneyText },
    heroSub: { ...Typography.caption, color: theme.onHeroMuted, marginTop: 2 },
    week: { flexDirection: 'row', marginTop: Spacing.three },
    day: { flex: 1, alignItems: 'center', gap: 5 },
    dayName: { ...Typography.micro, color: theme.onHeroMuted },
    dayNumberWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    dayToday: { backgroundColor: '#FFFFFF' },
    daySelected: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
    dayNumber: { ...Typography.bodyStrong, color: theme.onHero },
    dayNumberToday: { color: theme.hero },
    dayDot: { width: 6, height: 6, borderRadius: 3 },
    heroActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.three },
    payAll: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    payAllText: { ...Typography.bodyStrong, color: theme.hero },
    autoPay: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: { ...Typography.heading, color: theme.text, marginTop: Spacing.four, marginBottom: Spacing.three },
    empty: { ...Typography.callout, color: theme.textMuted },
    timeline: { position: 'relative' },
    timelineLine: {
      position: 'absolute',
      left: NODE / 2 - 1,
      top: NODE / 2,
      bottom: Spacing.four,
      width: 2,
      backgroundColor: theme.border,
    },
    group: { gap: Spacing.two, marginBottom: Spacing.three },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
    nodeWrap: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
    node: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: theme.backgroundMuted },
    nodeRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
    groupTitle: { ...Typography.callout, color: theme.text, fontWeight: '600', flex: 1 },
    billCard: {
      marginLeft: NODE + Spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: Radius.xl,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    billCardSelected: { borderColor: theme.primary },
    billTitle: { ...Typography.bodyStrong, color: theme.text },
    billSub: { ...Typography.caption, color: theme.textMuted, marginTop: 2 },
    payPill: { height: 34, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    payPillPrimary: { backgroundColor: theme.primary },
    payPillSoft: { backgroundColor: theme.primarySoft },
    payPillText: { ...Typography.caption, fontWeight: '700' },
    payPillTextPrimary: { color: theme.onPrimary },
    payPillTextSoft: { color: theme.onPrimarySoft },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
    tile: { width: '25%', alignItems: 'center', gap: 6 },
    tileLabel: { ...Typography.caption, color: theme.textSecondary },
    card: { borderRadius: Radius.xl, backgroundColor: theme.backgroundElement, paddingHorizontal: Spacing.three },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    historyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    paidChip: {
      paddingHorizontal: Spacing.two,
      paddingVertical: 3,
      borderRadius: Radius.pill,
      backgroundColor: theme.successSoft,
    },
    paidChipText: { ...Typography.micro, color: theme.success, fontWeight: '700' },
  });
}
