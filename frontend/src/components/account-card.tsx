import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CommonIcons } from '@/constants/icons';
import { BrandColors, Fonts, Spacing, type ThemeColors } from '@/constants/theme';
import { formatVND, groupDigits, maskNumber } from '@/helpers';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { Account, CardBrand } from '@/models/account';

interface Props {
  account: Account;
  hidden: boolean;
  onToggleHidden: () => void;
}

export default function AccountCard({ account, hidden, onToggleHidden }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const { card } = account;
  const rawNumber = card?.cardNumber ?? account.number;
  const displayNumber = hidden ? maskNumber(rawNumber) : groupDigits(rawNumber);

  return (
    <View style={styles.shadow}>
    <LinearGradient
      colors={[theme.hero, theme.heroElement]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <View style={[styles.circle, styles.circleLarge]} pointerEvents="none" />
      <View style={[styles.circle, styles.circleSmall]} pointerEvents="none" />

      <View style={styles.rowBetween}>
        <Text style={styles.bank}>{t('common.appName')}</Text>
        {card && <BrandLogo brand={card.brand} styles={styles} />}
      </View>

      <View style={styles.rowBetween}>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <View style={styles.chipLineH} />
            <View style={[styles.chipLineH, styles.chipLineH2]} />
            <View style={styles.chipLineV} />
          </View>
          <View style={styles.contactless}>
            {[8, 13, 18].map((size) => (
              <View
                key={size}
                style={[styles.wave, { width: size, height: size * 1.6, borderRadius: size }]}
              />
            ))}
          </View>
        </View>
        <Pressable
          onPress={onToggleHidden}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(hidden ? 'accountCard.showBalance' : 'accountCard.hideBalance')}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
          <SymbolView
            name={hidden ? CommonIcons.eyeSlash : CommonIcons.eye}
            size={16}
            tintColor={theme.onHero}
          />
        </Pressable>
      </View>

      <View style={styles.balanceBlock}>
        <Text style={styles.muted}>{t('accountCard.balance')}</Text>
        <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
          {hidden ? '••••••' : formatVND(account.balance)}
        </Text>
      </View>

      <Text style={styles.number} numberOfLines={1}>
        {displayNumber}
      </Text>

      {card && (
        <View style={styles.footer}>
          <View style={styles.flex}>
            <Text style={styles.caption}>{t('accountCard.holder')}</Text>
            <Text style={styles.value} numberOfLines={1}>
              {card.holderName}
            </Text>
          </View>
          <View style={styles.expiry}>
            <Text style={styles.caption}>{t('accountCard.expiry')}</Text>
            <Text style={styles.value}>{card.expiry}</Text>
          </View>
        </View>
      )}
    </LinearGradient>
    </View>
  );
}

function BrandLogo({ brand, styles }: { brand: CardBrand; styles: ReturnType<typeof createStyles> }) {
  if (brand === 'mastercard') {
    return (
      <View style={styles.mc} accessibilityLabel="Mastercard">
        <View style={[styles.mcCircle, { backgroundColor: BrandColors.mastercardRed }]} />
        <View style={[styles.mcCircle, styles.mcRight, { backgroundColor: BrandColors.mastercardOrange }]} />
      </View>
    );
  }
  if (brand === 'napas') {
    return <Text style={styles.napas}>napas</Text>;
  }
  return <Text style={styles.visa}>VISA</Text>;
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    shadow: { width: '100%', borderRadius: 20, boxShadow: theme.cardShadow },
    card: {
      width: '100%',
      aspectRatio: 1.586,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 18,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    balanceBlock: { gap: 1 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    circle: { position: 'absolute', backgroundColor: theme.onHero },
    circleLarge: { width: 220, height: 220, borderRadius: 110, top: -90, right: -70, opacity: 0.08 },
    circleSmall: { width: 140, height: 140, borderRadius: 70, bottom: -60, left: -40, opacity: 0.06 },
    flex: { flex: 1 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bank: { color: theme.onHero, fontSize: 16, lineHeight: 20, fontWeight: '800', letterSpacing: 0.5 },
    muted: { color: theme.onHeroMuted, fontSize: 11, lineHeight: 14 },
    visa: { color: theme.onHero, fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
    napas: { color: theme.onHero, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    mc: { flexDirection: 'row', width: 46, height: 28 },
    mcCircle: { width: 28, height: 28, borderRadius: 14 },
    mcRight: { marginLeft: -10, opacity: 0.9 },
    chipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    chip: {
      width: 34,
      height: 24,
      borderRadius: 6,
      backgroundColor: theme.cardChip,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    chipLineH: { position: 'absolute', left: 0, right: 0, top: 8, height: 1, backgroundColor: theme.cardChipLine },
    chipLineH2: { top: 16 },
    chipLineV: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 16,
      width: 1,
      backgroundColor: theme.cardChipLine,
    },
    contactless: { flexDirection: 'row', alignItems: 'center', height: 24 },
    wave: {
      marginLeft: -4,
      borderRightWidth: 2,
      borderColor: 'transparent',
      borderRightColor: theme.onHeroMuted,
    },
    toggle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.heroElement,
    },
    pressed: { opacity: 0.6 },
    balance: { color: theme.onHero, fontSize: 24, lineHeight: 30, fontWeight: '700' },
    number: { color: theme.onHero, fontSize: 15, lineHeight: 20, fontFamily: Fonts.mono, letterSpacing: 2.5 },
    caption: { color: theme.onHeroMuted, fontSize: 9, lineHeight: 12, letterSpacing: 1.2, marginBottom: 2 },
    value: { color: theme.onHero, fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.5 },
    expiry: { alignItems: 'flex-end', marginLeft: Spacing.four },
  });
}
