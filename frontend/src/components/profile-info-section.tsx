import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CommonIcons } from '@/constants/icons';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { maskEmail, maskIdNumber, maskPhone } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { User } from '@/models';

interface Row {
  label: string;
  value: string;
  masked: string;
}

interface Props {
  user: User;
}

export default function ProfileInfoSection({ user }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);

  const rows: Row[] = [];
  if (user.phone) rows.push({ label: t('profile.info.phone'), value: user.phone, masked: maskPhone(user.phone) });
  if (user.email) rows.push({ label: t('profile.info.email'), value: user.email, masked: maskEmail(user.email) });
  if (user.idNumber) {
    rows.push({ label: t('profile.info.idNumber'), value: user.idNumber, masked: maskIdNumber(user.idNumber) });
  }
  if (user.address) rows.push({ label: t('profile.info.address'), value: user.address, masked: user.address });

  if (rows.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.info.title')}</Text>
        <Pressable
          onPress={() => setRevealed((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(revealed ? 'profile.info.hide' : 'profile.info.show')}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
          <SymbolView
            name={revealed ? CommonIcons.eye : CommonIcons.eyeSlash}
            size={18}
            tintColor={theme.primary}
          />
        </Pressable>
      </View>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.row, i > 0 && styles.divider]}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{revealed ? row.value : row.masked}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.two,
      marginBottom: Spacing.two,
    },
    title: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: theme.textSecondary },
    toggle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
    },
    pressed: { opacity: 0.6 },
    card: {
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.three,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    label: { fontSize: 14, lineHeight: 19, color: theme.textMuted },
    value: { flex: 1, fontSize: 14, lineHeight: 19, color: theme.text, textAlign: 'right' },
  });
}
