import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommonIcons, FeatureIcons, SearchIcons } from '@/constants/icons';
import { Radius, Spacing, Typography, type ThemeColors, IconSize } from '@/constants/theme';
import { removeDiacritics } from '@/helpers';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemedStyles } from '@/shared/hooks/use-themed-styles';
import { useI18n } from '@/i18n';
import type { AppFeature, AppFeatureGroup } from '@/models';
import { getAppFeatures } from '@/services/feature.service';

const GROUP_ORDER: AppFeatureGroup[] = ['payments', 'accounts', 'cards', 'personal'];
// Type của RN không có `outlineStyle: 'none'` nhưng react-native-web nhận giá trị này.
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

const normalize = (value: string) => removeDiacritics(value).toLowerCase().trim();

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function FeatureSearchModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    getAppFeatures().then((res) => {
      if (active && res.success) setFeatures(res.items);
    });
    return () => {
      active = false;
    };
  }, []);

  const title = (f: AppFeature) => t(`search.features.${f.id}`);

  const sections = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      const popular = features.filter((f) => f.popular);
      return [
        ...(popular.length ? [{ key: 'popular', title: t('search.popular'), data: popular }] : []),
        ...GROUP_ORDER.map((g) => ({
          key: g,
          title: t(`search.groups.${g}`),
          data: features.filter((f) => f.group === g),
        })).filter((s) => s.data.length > 0),
      ];
    }
    // Khớp tên ưu tiên hơn khớp từ khoá phụ.
    const scored = features
      .map((f) => {
        const name = normalize(t(`search.features.${f.id}`));
        const group = normalize(t(`search.groups.${f.group}`));
        const score = name.startsWith(q) ? 3 : name.includes(q) ? 2 : f.keywords.some((k) => k.includes(q)) || group.includes(q) ? 1 : 0;
        return { f, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.f);
    return scored.length ? [{ key: 'results', title: '', data: scored }] : [];
  }, [features, query, t]);

  const close = () => {
    setQuery('');
    onClose();
  };

  const open = (f: AppFeature) => {
    close();
    if (f.route) router.navigate(f.route);
    else Alert.alert(title(f), t('common.comingSoon'));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
      {/* Modal là cửa sổ native riêng nên SafeAreaView bên trong không đo được tai thỏ/thanh trạng thái
          trên iOS; lấy insets từ provider rồi gắn padding thủ công. */}
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.inputWrap}>
            <SymbolView name={SearchIcons.search} size={IconSize.lg} tintColor={theme.primary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t('search.inputLabel')}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              style={styles.input}
            />
            {query !== '' && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <SymbolView name={CommonIcons.close} size={IconSize.sm} tintColor={theme.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button">
            <Text style={styles.cancel}>{t('common.cancel')}</Text>
          </Pressable>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('search.noResult')}</Text>}
          renderSectionHeader={({ section }) =>
            section.title ? <Text style={styles.section}>{section.title}</Text> : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <View style={styles.icon}>
                <SymbolView name={FeatureIcons[item.id]} size={IconSize.xl} tintColor={theme.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{title(item)}</Text>
                <Text style={styles.itemGroup}>{t(`search.groups.${item.group}`)}</Text>
              </View>
              {!item.route && <Text style={styles.soon}>{t('common.comingSoon')}</Text>}
              <SymbolView name={CommonIcons.chevronRight} size={IconSize.sm} tintColor={theme.textMuted} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.three,
    },
    inputWrap: {
      flex: 1,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: 14,
      borderRadius: Radius.pill,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    input: { flex: 1, height: '100%', fontSize: 16, color: theme.text, ...WEB_NO_OUTLINE },
    cancel: { ...Typography.bodyStrong, color: theme.primary },
    list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
    section: {
      ...Typography.caption,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: Spacing.three,
      marginBottom: Spacing.two,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
      paddingVertical: 10,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.lg,
    },
    itemPressed: { backgroundColor: theme.primarySoft },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemTitle: { ...Typography.bodyStrong, color: theme.text },
    itemGroup: { ...Typography.caption, color: theme.textMuted },
    soon: { ...Typography.micro, color: theme.textMuted },
    empty: { ...Typography.callout, color: theme.textMuted, textAlign: 'center', paddingTop: Spacing.five },
  });
}
