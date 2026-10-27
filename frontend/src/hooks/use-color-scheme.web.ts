import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const noopSubscribe = () => () => {};

// Static rendering has no color scheme; fall back to light until running on the client.
export function useColorScheme() {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();
  return isClient ? colorScheme : 'light';
}
