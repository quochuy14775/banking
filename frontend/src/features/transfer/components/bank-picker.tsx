import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BankLogo from '@/features/transfer/components/bank-logo';
import { CommonIcons, TransferIcons } from '@/constants/icons';
import { Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { Bank } from '@/models';
import { getBanks } from '@/services/bank.service';

interface Props {
  value: Bank | null;
  onChange: (bank: Bank) => void;
}

// Bỏ dấu để gõ "vietcom", "ngoai thuong" vẫn tìm được.
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

export default function BankPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    getBanks().then((res) => {
      if (active && res.success) setBanks(res.items);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return banks;
    return banks.filter((b) => normalize(`${b.code} ${b.shortName} ${b.name}`).includes(q));
  }, [banks, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${t('transfer.bankPlaceholder')}: ${value.shortName}` : t('transfer.bankPlaceholder')}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        {value && <BankLogo bank={value} size={24} />}
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? value.shortName : t('transfer.bankPlaceholder')}
        </Text>
        <SymbolView name={TransferIcons.chevronDown} size={IconSize.md} tintColor={theme.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('transfer.chooseBank')}</Text>
            <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <SymbolView name={CommonIcons.close} size={IconSize.lg} tintColor={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.search}>
            <SymbolView name={TransferIcons.search} size={IconSize.md} tintColor={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('transfer.searchBank')}
              placeholderTextColor={theme.textMuted}
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.code}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('transfer.noBank')}</Text>}
            renderItem={({ item }) => {
              const active = item.code === value?.code;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    close();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}>
                  <BankLogo bank={item} />
                  <View style={styles.flex}>
                    <Text style={styles.short}>{item.shortName}</Text>
                    <Text style={styles.full} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  {active && <SymbolView name={TransferIcons.check} size={IconSize.md} tintColor={theme.primary} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    pressed: { opacity: 0.7 },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    triggerText: { ...Typography.body, color: theme.text, flex: 1 },
    placeholder: { color: theme.textMuted },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '80%',
      paddingTop: Spacing.three,
      paddingHorizontal: Spacing.three,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      backgroundColor: theme.background,
      gap: Spacing.three,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...Typography.heading, color: theme.text },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.lg,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: { ...Typography.body, color: theme.text, flex: 1, paddingVertical: 10 },
    list: { flexGrow: 0 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      paddingVertical: Spacing.two + 2,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.md,
    },
    itemActive: { backgroundColor: theme.primarySoft },
    short: { ...Typography.bodyStrong, color: theme.text },
    full: { ...Typography.caption, color: theme.textMuted },
    empty: { ...Typography.callout, color: theme.textMuted, textAlign: 'center', paddingVertical: Spacing.four },
  });
}
