// app/components/connectivity/ConnectivityContext.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  isManualOfflineMode,
  setManualOfflineMode as setRuntimeManualOfflineMode,
  subscribeToManualOfflineMode,
} from "../../offline/connectivityMode";

import { getPendingCount, syncQueue } from "../../offline";

const STORAGE_KEY = "manual_offline_mode";

type ConnectivityContextValue = {
  initialized: boolean;

  /**
   * True when the user manually switched this app offline.
   */
  manualOffline: boolean;

  /**
   * True when the phone currently has usable internet.
   */
  hasInternet: boolean;

  /**
   * True only when the app may use remote APIs.
   */
  isOnline: boolean;

  isSyncing: boolean;
  pendingCount: number;

  setManualOffline: (offline: boolean) => Promise<void>;
  refreshPendingCount: () => Promise<number>;
  syncNow: () => Promise<void>;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(
  null,
);

function isNetworkUsable(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const [initialized, setInitialized] = useState(false);

  const [manualOffline, setManualOfflineState] = useState(
    isManualOfflineMode(),
  );

  const [hasInternet, setHasInternet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const syncRunningRef = useRef(false);
  const mountedRef = useRef(true);

  const refreshPendingCount = useCallback(async (): Promise<number> => {
    try {
      const count = await getPendingCount();

      if (mountedRef.current) {
        setPendingCount(count);
      }

      return count;
    } catch (error) {
      console.warn("Could not read pending count:", error);
      return 0;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    if (isManualOfflineMode()) {
      return;
    }

    if (syncRunningRef.current) {
      return;
    }

    const networkState = await NetInfo.fetch();

    if (!isNetworkUsable(networkState)) {
      if (mountedRef.current) {
        setHasInternet(false);
      }

      return;
    }

    /*
     * The user may have switched Offline while NetInfo was running.
     */
    if (isManualOfflineMode()) {
      return;
    }

    syncRunningRef.current = true;

    if (mountedRef.current) {
      setIsSyncing(true);
    }

    try {
      await syncQueue();
      await refreshPendingCount();
    } catch (error) {
      console.error("Manual synchronization failed:", error);
    } finally {
      syncRunningRef.current = false;

      if (mountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [refreshPendingCount]);

  const setManualOffline = useCallback(
    async (offline: boolean): Promise<void> => {
      /*
       * Change the runtime value immediately. Do this before awaiting
       * AsyncStorage so API calls are blocked immediately.
       */
      setRuntimeManualOfflineMode(offline);
      setManualOfflineState(offline);

      try {
        await AsyncStorage.setItem(STORAGE_KEY, offline ? "true" : "false");
      } catch (error) {
        console.warn("Could not store manual offline preference:", error);
      }

      await refreshPendingCount();

      if (!offline) {
        /*
         * Switching back Online automatically attempts synchronization.
         */
        await syncNow();
      }
    },
    [refreshPendingCount, syncNow],
  );

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribeRuntime = subscribeToManualOfflineMode((offline) => {
      if (mountedRef.current) {
        setManualOfflineState(offline);
      }
    });

    async function initialize() {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

        const storedOffline = storedValue === "true";

        setRuntimeManualOfflineMode(storedOffline);

        if (mountedRef.current) {
          setManualOfflineState(storedOffline);
        }
      } catch (error) {
        console.warn("Could not restore connectivity preference:", error);
      }

      const networkState = await NetInfo.fetch();
      const connected = isNetworkUsable(networkState);

      if (mountedRef.current) {
        setHasInternet(connected);
        setInitialized(true);
      }

      await refreshPendingCount();

      if (connected && !isManualOfflineMode()) {
        void syncNow();
      }
    }

    void initialize();

    return () => {
      mountedRef.current = false;
      unsubscribeRuntime();
    };
  }, [refreshPendingCount, syncNow]);

  useEffect(() => {
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const connected = isNetworkUsable(state);

      if (mountedRef.current) {
        setHasInternet(connected);
      }

      if (connected && !isManualOfflineMode()) {
        void syncNow();
      }
    });

    return unsubscribeNetwork;
  }, [syncNow]);

  const value = useMemo<ConnectivityContextValue>(
    () => ({
      initialized,
      manualOffline,
      hasInternet,

      isOnline: initialized && hasInternet && !manualOffline,

      isSyncing,
      pendingCount,

      setManualOffline,
      refreshPendingCount,
      syncNow,
    }),
    [
      initialized,
      manualOffline,
      hasInternet,
      isSyncing,
      pendingCount,
      setManualOffline,
      refreshPendingCount,
      syncNow,
    ],
  );

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const context = useContext(ConnectivityContext);

  if (!context) {
    throw new Error("useConnectivity must be used inside ConnectivityProvider");
  }

  return context;
}
