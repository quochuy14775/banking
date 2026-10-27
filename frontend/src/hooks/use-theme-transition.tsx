import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { captureScreen } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';

import { useSettings } from '@/lib/settingsStore';
import type { ThemePreference } from '@/models';

// Chụp sau khi màn hình chứa nút chọn đã mở xong, để lúc bấm không phải chờ chụp (chụp chiếm luồng giao diện).
const PREPARE_DELAY = 420;
const REFRESH_DELAY = 160;
// Gần bằng thời gian nút chọn trượt, để màu app và nút chuyển cùng nhịp. Bề mặt nào tự đổi màu mượt thì dùng chung 2 giá trị này.
export const THEME_FADE_DURATION = 320;
export const THEME_FADE_EASING = Easing.out(Easing.cubic);

interface ThemeTransition {
  selectedTheme: ThemePreference;
  changeTheme: (theme: ThemePreference) => void;
  // Đặt dưới bề mặt chứa nút chọn: phần đó không đổi màu theo theme nên không cần che.
  overlay: ReactNode;
}

export function useThemeTransition(active: boolean): ThemeTransition {
  const { settings, updateSettings } = useSettings();
  const reducedMotion = useReducedMotion();
  const enabled = active && !reducedMotion && Platform.OS !== 'web';
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference | null>(null);
  const enabledRef = useRef(enabled);
  const ready = useRef(false);
  const capturing = useRef(false);
  const showing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  async function capture() {
    if (capturing.current || !enabledRef.current) return;
    capturing.current = true;
    ready.current = false;
    try {
      const uri = await captureScreen({ format: 'jpg', quality: 0.6, result: 'tmpfile' });
      if (enabledRef.current) setSnapshot(uri);
    } catch {
      // Không chụp được thì đổi theme tức thì như bình thường.
    } finally {
      capturing.current = false;
    }
  }

  function scheduleCapture(delay: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void capture();
    }, delay);
  }

  useEffect(() => {
    enabledRef.current = enabled;
    ready.current = false;
    if (!enabled) return;
    scheduleCapture(PREPARE_DELAY);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // scheduleCapture chỉ đọc ref, không cần nằm trong deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  function finish() {
    showing.current = false;
    setSelectedTheme(null);
    scheduleCapture(REFRESH_DELAY);
  }

  function fadeOut() {
    opacity.set(
      withTiming(0, { duration: THEME_FADE_DURATION, easing: THEME_FADE_EASING }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finish);
      }),
    );
  }

  function changeTheme(theme: ThemePreference) {
    if (theme === (selectedTheme ?? settings.theme)) return;

    if (!enabled || (!ready.current && !showing.current)) {
      updateSettings({ theme });
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    setSelectedTheme(theme);
    cancelAnimation(opacity);
    opacity.set(1);
    showing.current = true;
    // Khung 1: ảnh cũ phủ lên. Khung 2: đổi theme bên dưới. Hai khung sau: giao diện mới đã vẽ, bắt đầu làm mờ ảnh.
    requestAnimationFrame(() => {
      updateSettings({ theme });
      requestAnimationFrame(() => requestAnimationFrame(fadeOut));
    });
  }

  const overlay =
    enabled && snapshot ? (
      <Animated.Image
        source={{ uri: snapshot }}
        onLoad={() => {
          ready.current = true;
        }}
        fadeDuration={0}
        resizeMode="cover"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, overlayStyle]}
      />
    ) : null;

  return {
    selectedTheme: selectedTheme ?? settings.theme,
    changeTheme,
    overlay,
  };
}
