import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Có nên chạy chuyển động lặp đặc trưng lúc này không: chỉ khi `enabled`, màn đang được focus,
 * app đang ở foreground và người dùng không bật "Giảm chuyển động". Khi trả về false,
 * component dừng loop và đứng ở trạng thái tĩnh.
 */
export function useAmbientLoop(enabled = true): boolean {
  const reducedMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  return enabled && focused && appActive && !reducedMotion;
}
