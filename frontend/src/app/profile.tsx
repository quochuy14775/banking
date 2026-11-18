import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileIdentityCard from '@/features/profile/components/profile-identity-card';
import ProfileInfoSection from '@/features/profile/components/profile-info-section';
import { ProfileIcons } from '@/constants/icons';
import { Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { useConfirmLogout } from '@/features/auth/hooks/use-confirm-logout';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import { useAuth } from '@/features/auth/store/authStore';

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { user } = useAuth();
  const confirmLogout = useConfirmLogout();
  if (!user) return null;
  const profile = user;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <Pressable
          onPress={() => Alert.alert(t('profile.edit'), t('common.comingSoon'))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={ProfileIcons.edit} size={IconSize.lg} tintColor={theme.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ProfileIdentityCard user={profile} />
        <ProfileInfoSection user={profile} />
        <Pressable
          onPress={confirmLogout}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
          <SymbolView name={ProfileIcons.logout} size={IconSize.lg} tintColor={theme.danger} />
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.one,
    },
    title: { ...Typography.display, color: theme.text },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
    },
    pressed: { opacity: 0.6 },
    content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 16,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    logoutText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: theme.danger },
  });
}
