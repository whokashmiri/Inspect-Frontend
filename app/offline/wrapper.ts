import { v4 as uuidv4 } from 'uuid';
import NetInfo from "@react-native-community/netinfo";
import { savePending, initStorage } from './storage';
import { PendingItem, OfflineResult, OfflineAction } from './types';

export async function safeApiCall<T>(
  apiFn: () => Promise<T>,
  fallbackPayload: any,
  options: {
    type: OfflineAction;
    projectId?: string;
    localImageUris?: string[];
  }
): Promise<T | OfflineResult> {
  // Ensure storage initialized
  await initStorage();

  const state = await NetInfo.fetch();
  const isOnline = state.isConnected ?? false;

  if (isOnline) {
    try {
      return await apiFn();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // Offline: queue it
  const localId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const pending: Omit<PendingItem, 'status' | 'retryCount' | 'lastAttempt'> = {
    id: localId,
    type: options.type,
    payload: fallbackPayload,
    projectId: options.projectId,
    localImageUris: options.localImageUris,
    createdAt: Date.now()
  };

  await savePending(pending);

  return {
    offline: true,
    localId,
    message: 'Saved offline - will sync when online'
  } as OfflineResult;
}

// For React components (hook version)
export function useSafeApiCall() {
  return async <T,>(
    apiFn: () => Promise<T>,
    fallbackPayload: any,
    options: Parameters<typeof safeApiCall>[2]
  ): Promise<T | OfflineResult> => safeApiCall(apiFn, fallbackPayload, options);
}
