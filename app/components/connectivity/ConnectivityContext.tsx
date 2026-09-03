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

/*
 * Stores one selected work mode for every project.
 *
 * Example:
 * {
 *   "project-id-1": "online",
 *   "project-id-2": "offline"
 * }
 */
const PROJECT_WORK_MODES_KEY = "project_work_modes";

export type ProjectWorkMode = "online" | "offline";

export async function clearConnectivityStorage(): Promise<void> {
  try {
    await AsyncStorage.removeMany([STORAGE_KEY, PROJECT_WORK_MODES_KEY]);

    /*
     * Also reset the runtime singleton,
     * otherwise the app can remain in manual
     * offline mode until restart.
     */
    setRuntimeManualOfflineMode(false);

    console.log("✅ Connectivity settings cleared");
  } catch (error) {
    console.warn("[Connectivity] Failed to clear settings", error);
  }
}

type ProjectWorkModeMap = Record<string, ProjectWorkMode>;

type ConnectivityContextValue = {
  initialized: boolean;

  manualOffline: boolean;
  hasInternet: boolean;
  isOnline: boolean;

  isSyncing: boolean;
  pendingCount: number;

  setManualOffline: (offline: boolean) => Promise<void>;

  refreshPendingCount: () => Promise<number>;
  syncNow: () => Promise<void>;

  /*
   * Returns the saved choice for a project.
   * Returns null when the user has not chosen yet.
   */
  getProjectWorkMode: (projectId: string) => ProjectWorkMode | null;

  /*
   * Saves the choice and changes the app's
   * current online/offline mode.
   */
  setProjectWorkMode: (
    projectId: string,
    mode: ProjectWorkMode,
  ) => Promise<void>;

  /*
   * Optional helper if you later want the app
   * to ask again for a project.
   */
  clearProjectWorkMode: (projectId: string) => Promise<void>;
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

  const [projectWorkModes, setProjectWorkModes] = useState<ProjectWorkModeMap>(
    {},
  );

  /*
   * A ref gives us the latest value immediately,
   * without waiting for a React render.
   */
  const projectWorkModesRef = useRef<ProjectWorkModeMap>({});

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
    if (syncRunningRef.current) {
      return;
    }

    if (isManualOfflineMode()) {
      return;
    }

    /*
     * Lock immediately before any await.
     */
    syncRunningRef.current = true;

    if (mountedRef.current) {
      setIsSyncing(true);
    }

    try {
      const networkState = await NetInfo.fetch();

      if (!isNetworkUsable(networkState)) {
        if (mountedRef.current) {
          setHasInternet(false);
        }

        return;
      }

      if (isManualOfflineMode()) {
        return;
      }

      await syncQueue();
      await refreshPendingCount();
    } catch (error) {
      console.error("Synchronization failed:", error);
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
       * Update runtime state immediately so API
       * calls are blocked without waiting for storage.
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
         * Returning online starts synchronization.
         */
        await syncNow();
      }
    },
    [refreshPendingCount, syncNow],
  );

  const getProjectWorkMode = useCallback(
    (projectId: string): ProjectWorkMode | null => {
      if (!projectId) {
        return null;
      }

      return projectWorkModesRef.current[projectId] ?? null;
    },
    [],
  );

  const setProjectWorkMode = useCallback(
    async (projectId: string, mode: ProjectWorkMode): Promise<void> => {
      if (!projectId) {
        return;
      }

      const nextModes: ProjectWorkModeMap = {
        ...projectWorkModesRef.current,
        [projectId]: mode,
      };

      /*
       * Update immediately before awaiting storage.
       */
      projectWorkModesRef.current = nextModes;

      if (mountedRef.current) {
        setProjectWorkModes(nextModes);
      }

      try {
        await AsyncStorage.setItem(
          PROJECT_WORK_MODES_KEY,
          JSON.stringify(nextModes),
        );
      } catch (error) {
        console.warn("Could not save project work mode:", error);
      }

      /*
       * Apply the selected work mode.
       */
      await setManualOffline(mode === "offline");
    },
    [setManualOffline],
  );

  const clearProjectWorkMode = useCallback(
    async (projectId: string): Promise<void> => {
      if (!projectId) {
        return;
      }

      const nextModes = {
        ...projectWorkModesRef.current,
      };

      delete nextModes[projectId];

      projectWorkModesRef.current = nextModes;

      if (mountedRef.current) {
        setProjectWorkModes(nextModes);
      }

      try {
        await AsyncStorage.setItem(
          PROJECT_WORK_MODES_KEY,
          JSON.stringify(nextModes),
        );
      } catch (error) {
        console.warn("Could not clear project work mode:", error);
      }
    },
    [],
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
        const [storedOfflineValue, storedProjectModesValue] = await Promise.all(
          [
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(PROJECT_WORK_MODES_KEY),
          ],
        );

        const storedOffline = storedOfflineValue === "true";

        setRuntimeManualOfflineMode(storedOffline);

        if (mountedRef.current) {
          setManualOfflineState(storedOffline);
        }

        if (storedProjectModesValue) {
          try {
            const parsedModes = JSON.parse(storedProjectModesValue);

            const validModes: ProjectWorkModeMap = {};

            if (parsedModes && typeof parsedModes === "object") {
              Object.entries(parsedModes).forEach(([projectId, mode]) => {
                if (mode === "online" || mode === "offline") {
                  validModes[projectId] = mode;
                }
              });
            }

            projectWorkModesRef.current = validModes;

            if (mountedRef.current) {
              setProjectWorkModes(validModes);
            }
          } catch (error) {
            console.warn("Could not parse project work modes:", error);
          }
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

      getProjectWorkMode,
      setProjectWorkMode,
      clearProjectWorkMode,
    }),
    [
      initialized,
      manualOffline,
      hasInternet,
      isSyncing,
      pendingCount,
      projectWorkModes,
      setManualOffline,
      refreshPendingCount,
      syncNow,
      getProjectWorkMode,
      setProjectWorkMode,
      clearProjectWorkMode,
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
