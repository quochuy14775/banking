import * as avataaars from '@dicebear/avataaars';
import { createAvatar } from '@dicebear/core';
import { Image } from 'expo-image';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { User } from '@/models';

interface Props {
  user: Pick<User, 'id' | 'fullName' | 'avatarUrl'>;
  size?: number;
  // Màu nền cố định, dùng khi avatar nằm trên bề mặt không đổi theo theme (ví dụ ngăn kéo).
  surfaceColor?: string;
  onPress?: () => void;
}

export default function UserAvatar({ user, size = 40, surfaceColor, onPress }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, size, surfaceColor), [theme, size, surfaceColor]);
  const { t } = useI18n();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const avatarBackground = surfaceColor ?? theme.primarySoft;

  const fallbackSvg = useMemo(
    () =>
      createAvatar(avataaars, {
        seed: user.id,
        backgroundColor: [avatarBackground.replace('#', '')],
      }).toString(),
    [user.id, avatarBackground],
  );

  const imageUrl = user.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : null;

  const content: ReactNode = (
    <View style={styles.circle}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.fill}
          contentFit="cover"
          transition={150}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <SvgXml xml={fallbackSvg} width="100%" height="100%" />
      )}
    </View>
  );

  if (!onPress) {
    return (
      <View style={styles.ring} accessibilityRole="image" accessibilityLabel={t('avatar.image', { name: user.fullName })}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={t('avatar.button', { name: user.fullName })}
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function createStyles(theme: ThemeColors, size: number, surfaceColor?: string) {
  return StyleSheet.create({
    ring: {
      width: size,
      height: size,
      borderRadius: size / 2,
      padding: 2,
      backgroundColor: surfaceColor ?? theme.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: surfaceColor ?? theme.border,
    },
    pressed: { transform: [{ scale: 0.94 }] },
    circle: {
      flex: 1,
      borderRadius: size / 2,
      overflow: 'hidden',
      backgroundColor: surfaceColor ?? theme.primarySoft,
    },
    fill: { width: '100%', height: '100%' },
  });
}
