// app/offline/connectivityMode.ts

let manualOfflineMode = false;

type ConnectivityModeListener = (offline: boolean) => void;

const listeners = new Set<ConnectivityModeListener>();

export function isManualOfflineMode(): boolean {
  return manualOfflineMode;
}

export function setManualOfflineMode(offline: boolean): void {
  if (manualOfflineMode === offline) {
    return;
  }

  manualOfflineMode = offline;

  listeners.forEach((listener) => {
    try {
      listener(offline);
    } catch (error) {
      console.warn("Connectivity mode listener failed:", error);
    }
  });
}

export function subscribeToManualOfflineMode(
  listener: ConnectivityModeListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}