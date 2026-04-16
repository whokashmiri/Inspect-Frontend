
//offline/network.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  return isOnline ?? true;
}
