import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/components/primary-button';
import { KycIcons, OnboardingIcons, TransferIcons, type IconName } from '@/constants/icons';
import { Fonts, IconSize, Radius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { formatDateTime, onboardingErrorText } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { ApplicationStatusView, SavedApplication } from '@/models';
import { getApplicationStatus } from '@/services/customer.service';

interface Props {
  application: SavedApplication;
  onExit: () => void;
  /** Hồ sơ đã duyệt: sang bước tạo tài khoản đăng nhập. */
  onApproved: () => void;
  /** Bị từ chối hoặc không còn trên máy chủ: quên hồ sơ trên máy và làm hồ sơ mới. */
  onStartOver: () => void;
}

/**
 * Trạng thái hồ sơ đã gửi: chờ duyệt, bị từ chối (kèm lý do) hoặc đã duyệt (kèm số CIF). App không tự hỏi liên tục;
 * khách bấm "Kiểm tra lại", hoặc mở lại app là màn này kiểm tra một lần.
 */
export default function OnboardingStatus({ application, onExit, onApproved, onStartOver }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [view, setView] = useState<ApplicationStatusView | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getApplicationStatus(application).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.success && res.view) {
        setView(res.view);
        setError(null);
      } else {
        setError({ text: onboardingErrorText(t, res.error, res.message), notFound: res.error === 'notFound' });
      }
    });
    return () => {
      active = false;
    };
  }, [application, reloadKey, t]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });
    return () => subscription.remove();
  }, [onExit]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  let icon: IconName = OnboardingIcons.pending;
  let iconColor = theme.info;
  let iconBackground = theme.infoSoft;
  let title = t('onboarding.status.pendingTitle');
  let message = t('onboarding.status.pendingMessage');
  if (view?.status === 'APPROVED') {
    icon = KycIcons.verified;
    iconColor = theme.success;
    iconBackground = theme.successSoft;
    title = t('onboarding.status.approvedTitle');
    message = t('onboarding.status.approvedMessage');
  } else if (view?.status === 'REJECTED') {
    icon = OnboardingIcons.rejected;
    iconColor = theme.danger;
    iconBackground = theme.dangerSoft;
    title = t('onboarding.status.rejectedTitle');
    message = t('onboarding.status.rejectedMessage', { reason: view.rejectReason ?? '' });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={onExit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('transfer.back')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={TransferIcons.back} size={IconSize.lg} tintColor={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('onboarding.status.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {view && (
          <Animated.View key={view.status} entering={FadeIn.duration(220)} style={styles.head}>
            <View style={[styles.icon, { backgroundColor: iconBackground }]}>
              <SymbolView name={icon} size={IconSize.badge} tintColor={iconColor} />
            </View>
            <Text style={[styles.title, styles.center]}>{title}</Text>
            <Text style={[styles.subtitle, styles.center]}>{message}</Text>
          </Animated.View>
        )}

        <View style={styles.card}>
          {application.fullName !== '' && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('kyc.fields.fullName')}</Text>
              <Text style={styles.rowValue}>{application.fullName}</Text>
            </View>
          )}
          {view && (
            <View style={[styles.row, styles.divider]}>
              <Text style={styles.rowLabel}>{t('onboarding.status.submittedAt')}</Text>
              <Text style={[styles.rowValue, styles.mono]}>{formatDateTime(view.submittedAt)}</Text>
            </View>
          )}
          {view?.cifNumber && (
            <View style={[styles.row, styles.divider]}>
              <Text style={styles.rowLabel}>{t('onboarding.status.cifNumber')}</Text>
              <Text style={[styles.rowValue, styles.mono]}>{view.cifNumber}</Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.subtitle}>{t('onboarding.status.checking')}</Text>
          </View>
        )}
        {!loading && error && (
          <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
            {error.text}
          </Text>
        )}

        {view?.status === 'APPROVED' ? (
          <PrimaryButton label={t('onboarding.status.createLogin')} onPress={onApproved} />
        ) : view?.status === 'REJECTED' || error?.notFound ? (
          <PrimaryButton label={t('onboarding.status.startOver')} onPress={onStartOver} />
        ) : (
          <PrimaryButton label={t('onboarding.status.refresh')} onPress={refresh} loading={loading} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundMuted },
    pressed: { opacity: 0.6 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { ...Typography.title, color: theme.text, flex: 1 },
    content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
    head: { alignItems: 'center', gap: Spacing.one, paddingTop: Spacing.three },
    icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
    title: { ...Typography.title, color: theme.text },
    subtitle: { ...Typography.callout, color: theme.textSecondary },
    center: { textAlign: 'center' },
    card: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.one,
      borderRadius: Radius.xxl,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 11 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    rowLabel: { ...Typography.callout, width: 110, color: theme.textMuted },
    rowValue: { ...Typography.body, flex: 1, color: theme.text },
    mono: { fontFamily: Fonts.mono },
    loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
    error: { ...Typography.callout, color: theme.danger, textAlign: 'center' },
  });
}
