import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AccountCard from '@/components/account-card';
import AccountDrawer from '@/components/account-drawer';
import FinancialScoreCard from '@/components/financial-score-card';
import NotificationBell from '@/components/notification-bell';
import NotificationSheet from '@/components/notification-sheet';
import UserAvatar from '@/components/user-avatar';
import { Spacing } from '@/constants/theme';
import { useFinancialHealth } from '@/hooks/use-financial-health';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/authStore';
import { mockAccounts, mockUser } from '@/lib/mockData';
import { useNotifications } from '@/lib/notificationStore';

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [showBalance, setShowBalance] = useState(true);
  const { unreadCount } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const financialHealth = useFinancialHealth();
  const background = useMemo(() => ({ backgroundColor: theme.background }), [theme]);

  const checking = mockAccounts[0];

  return (
    <SafeAreaView style={[styles.flex, background]} edges={['top']}>
      <View style={styles.header}>
        <NotificationBell count={unreadCount} onPress={() => setNotificationsOpen(true)} />
        <UserAvatar user={user ?? mockUser} onPress={() => setDrawerOpen(true)} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AccountCard
          account={checking}
          hidden={!showBalance}
          onToggleHidden={() => setShowBalance((v) => !v)}
        />
        {financialHealth && (
          <FinancialScoreCard
            data={financialHealth}
            onPress={() => Alert.alert(t('financialHealth.title'), t('common.comingSoon'))}
          />
        )}
      </ScrollView>
      <NotificationSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AccountDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenProfile={() => {
          setDrawerOpen(false);
          router.navigate('/profile');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
});
