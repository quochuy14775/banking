import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AccountCard from '@/components/account-card';
import AccountDrawer from '@/components/account-drawer';
import AppLogo from '@/components/app-logo';
import BillPaySheet, { type BillSheetMode } from '@/components/bill-pay-sheet';
import FeatureSearchModal from '@/components/feature-search-modal';
import FinancialScoreCard from '@/components/financial-score-card';
import InsightCard from '@/components/insight-card';
import NotificationBell from '@/components/notification-bell';
import NotificationSheet from '@/components/notification-sheet';
import SavingsGoalsCard from '@/components/savings-goals-card';
import SpendingCard from '@/components/spending-card';
import UpcomingBillsCard from '@/components/upcoming-bills-card';
import UserAvatar from '@/components/user-avatar';
import { SearchIcons } from '@/constants/icons';
import { Spacing, IconSize } from '@/constants/theme';
import { useAccounts } from '@/hooks/use-accounts';
import { useFinancialHealth } from '@/hooks/use-financial-health';
import { useInsights, useSavingsGoals, useSpendingSummary, useUpcomingBills } from '@/hooks/use-home-widgets';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/authStore';
import { useNotifications } from '@/lib/notificationStore';

const TAB_BAR_CLEARANCE = 120;

// Motion trên Home: ít, có lý do, chậm dần về cuối, không nảy. Reanimated tự bỏ qua khi máy bật "Giảm chuyển động".
const EASE_OUT = Easing.out(Easing.cubic);
// Khối phía dưới trượt lên khi một khối phía trên biến mất (vd đóng gợi ý), thay vì nhảy.
const SLIDE = LinearTransition.duration(240).easing(EASE_OUT);
const INTRO_STAGGER_MS = 40;
// Các card chỉ hiện dần một lần mỗi phiên mở app, không chạy lại mỗi lần quay về Home.
let homeIntroPlayed = false;

/** Card hiện dần + trượt lên 8pt, lệch nhau `order × 40ms`. */
function introAnimation(order: number) {
  const delay = order * INTRO_STAGGER_MS;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 220, easing: EASE_OUT })),
        transform: [{ translateY: withDelay(delay, withTiming(0, { duration: 220, easing: EASE_OUT })) }],
      },
    };
  };
}

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [showBalance, setShowBalance] = useState(true);
  const { unreadCount } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();
  const financialHealth = useFinancialHealth();
  const background = useMemo(() => ({ backgroundColor: theme.background }), [theme]);

  const accounts = useAccounts();
  const checking = accounts[0];
  const { items: upcomingBills, providers: billProviders, reload: reloadBills } = useUpcomingBills();
  const [billSheet, setBillSheet] = useState<BillSheetMode | null>(null);
  const spending = useSpendingSummary();
  const { items: insights, dismiss: dismissInsight } = useInsights();
  const { goals, contribute } = useSavingsGoals();
  const insight = insights[0];
  // Chốt một lần lúc mount: phiên này đã chạy hiệu ứng vào chưa.
  const [playIntro] = useState(() => !homeIntroPlayed);
  useEffect(() => {
    homeIntroPlayed = true;
  }, []);
  const block = (order: number, children: ReactNode, exitOnRemove = false) => (
    <Animated.View
      entering={playIntro ? introAnimation(order) : undefined}
      exiting={exitOnRemove ? FadeOut.duration(160) : undefined}
      layout={SLIDE}>
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.flex, background]} edges={['top']}>
      <View style={styles.header}>
        <AppLogo size={40} />
        <Pressable
          onPress={() => setSearchOpen(true)}
          accessibilityRole="search"
          accessibilityLabel={t('search.open')}
          style={({ pressed }) => [
            styles.search,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <SymbolView name={SearchIcons.search} size={IconSize.lg} tintColor={theme.primary} />
          <Text style={[styles.searchText, { color: theme.textMuted }]} numberOfLines={1}>
            {t('search.placeholder')}
          </Text>
        </Pressable>
        <NotificationBell count={unreadCount} onPress={() => setNotificationsOpen(true)} />
        {user && <UserAvatar user={user} onPress={() => setDrawerOpen(true)} />}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {checking &&
          block(
            0,
            <AccountCard
              account={checking}
              hidden={!showBalance}
              onToggleHidden={() => setShowBalance((v) => !v)}
            />,
          )}
        {checking &&
          upcomingBills &&
          block(
            1,
            <UpcomingBillsCard
              items={upcomingBills}
              balance={checking.balance}
              hidden={!showBalance}
              onPay={(bills) => setBillSheet({ kind: 'pay', items: bills.map(({ bill, label }) => ({ bill, label })) })}
            />,
          )}
        {spending && block(2, <SpendingCard data={spending} />)}
        {insight &&
          block(
            3,
            <InsightCard
              insight={insight}
              onSetLimit={() => Alert.alert(t('home.insight.setLimit'), t('common.comingSoon'))}
              onDismiss={() => dismissInsight(insight.id)}
            />,
            true,
          )}
        {goals.length > 0 && block(4, <SavingsGoalsCard goals={goals} onContribute={contribute} />)}
        {financialHealth &&
          block(
            5,
            <FinancialScoreCard
              data={financialHealth}
              onPress={() => Alert.alert(t('financialHealth.title'), t('common.comingSoon'))}
            />,
          )}
      </ScrollView>
      <BillPaySheet mode={billSheet} providers={billProviders} onClose={() => setBillSheet(null)} onPaid={reloadBills} />
      <NotificationSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <FeatureSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <AccountDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenProfile={() => {
          setDrawerOpen(false);
          router.navigate('/profile');
        }}
        onOpenKyc={() => {
          setDrawerOpen(false);
          router.navigate('/kyc');
        }}
        onOpenSmartOtp={() => {
          setDrawerOpen(false);
          router.navigate('/smart-otp');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  search: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchText: { flex: 1, fontSize: 14 },
  pressed: { opacity: 0.7 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    // Chừa chỗ cho thanh tab nổi + nút FAB đè lên cuối nội dung.
    paddingBottom: TAB_BAR_CLEARANCE,
  },
});
