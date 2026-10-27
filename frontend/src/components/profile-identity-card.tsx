import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import UserAvatar from '@/components/user-avatar';
import { ProfileIcons, type IconName } from '@/constants/icons';
import { Fonts, Spacing, type ThemeColors } from '@/constants/theme';
import { buildReceiveQrPayload, toCardName } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { User } from '@/models';

const QR_SIZE = 168;
const COPIED_RESET_MS = 1500;

type Styles = ReturnType<typeof createStyles>;

interface Props {
  user: User;
}

export default function ProfileIdentityCard({ user }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const cardName = toCardName(user.fullName);
  const accountDigits = user.accountNumber.replace(/\D/g, '');

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyAccount() {
    await Clipboard.setStringAsync(accountDigits);
    setCopied(true);
  }

  function shareAccount() {
    void Share.share({
      message: t('profile.shareMessage', { name: cardName, account: user.accountNumber }),
    });
  }

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[theme.primary, theme.scoreEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <UserAvatar user={user} size={56} />
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {cardName}
          </Text>
          <Text style={styles.member}>
            {t('common.appName')}
            {user.memberSince ? ` · ${t('profile.memberSince', { year: user.memberSince })}` : ''}
          </Text>
        </View>
        {user.kycVerified && (
          <View style={styles.badge}>
            <SymbolView name={ProfileIcons.verified} size={13} tintColor={theme.onHero} />
            <Text style={styles.badgeText}>eKYC</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.qrArea}>
        <View style={styles.qrFrame} accessible accessibilityLabel={t('profile.qrLabel')}>
          <QRCode
            value={buildReceiveQrPayload(user)}
            size={QR_SIZE}
            color={theme.text}
            backgroundColor={theme.backgroundElement}
            ecl="M"
          />
        </View>
        <Text style={styles.hint}>{t('profile.scanHint')}</Text>
        <Pressable
          onPress={() => void copyAccount()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('profile.copyAccount', { account: user.accountNumber })}
          style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
          <Text style={styles.account}>{user.accountNumber}</Text>
          <SymbolView name={ProfileIcons.copy} size={16} tintColor={theme.primary} />
        </Pressable>
        <Text style={[styles.copied, !copied && styles.hidden]}>{t('profile.copied')}</Text>
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon={ProfileIcons.share}
          label={t('profile.share')}
          onPress={shareAccount}
          styles={styles}
          theme={theme}
        />
        <ActionButton
          icon={ProfileIcons.save}
          label={t('profile.saveImage')}
          onPress={() => Alert.alert(t('profile.saveImage'), t('common.comingSoon'))}
          styles={styles}
          theme={theme}
        />
      </View>
    </View>
  );
}

interface ActionButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: Styles;
  theme: ThemeColors;
}

function ActionButton({ icon, label, onPress, styles, theme }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <SymbolView name={icon} size={16} tintColor={theme.onPrimarySoft} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three },
    flex: { flex: 1 },
    name: { fontSize: 18, lineHeight: 23, fontWeight: '700', color: theme.onHero, letterSpacing: 0.3 },
    member: { fontSize: 12, lineHeight: 16, marginTop: 2, color: theme.onHeroMuted },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: theme.heroElement,
    },
    badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: theme.onHero },
    qrArea: { alignItems: 'center', paddingTop: Spacing.four, paddingBottom: Spacing.two },
    qrFrame: {
      padding: 12,
      borderRadius: 18,
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    hint: { fontSize: 13, lineHeight: 18, marginTop: 12, color: theme.textSecondary },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    account: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      letterSpacing: 1.5,
      fontFamily: Fonts.mono,
      color: theme.text,
    },
    copied: { fontSize: 12, lineHeight: 16, marginTop: 4, color: theme.success, fontWeight: '600' },
    hidden: { opacity: 0 },
    pressed: { opacity: 0.6 },
    actions: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, paddingTop: Spacing.two },
    action: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
    },
    actionText: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: theme.onPrimarySoft },
  });
}
