// offline/index.ts or offline/safeApiCall.ts

import NetInfo from "@react-native-community/netinfo";
import { savePending, initStorage } from "./storage";
import { PendingItem, OfflineResult, OfflineAction } from "./types";
import { getCachedUser, isOfflineSessionValid } from "./authStorage";
import { persistOfflineMediaPayload } from "./mediaStorage";

function extractLocalMediaUris(payload: any, type: OfflineAction): string[] {
  if ((type !== "createAsset" && type !== "updateAsset") || !payload) return [];

  const imageUris = Array.isArray(payload.images)
    ? payload.images
        .map((item: any) => item?.uri)
        .filter((uri: any) => typeof uri === "string" && !uri.startsWith("http"))
    : [];

  const voiceUris = Array.isArray(payload.voiceNotes)
    ? payload.voiceNotes
        .map((item: any) => item?.uri)
        .filter((uri: any) => typeof uri === "string" && !uri.startsWith("http"))
    : [];

  return [...imageUris, ...voiceUris];
}

function shouldPersistMedia(type: OfflineAction) {
  return type === "createAsset" || type === "updateAsset";
}

export async function safeApiCall<T>(
  apiFn: () => Promise<T>,
  fallbackPayload: any,
  options: {
    type: OfflineAction;
    projectId?: string;
    localMediaUris?: string[];
  }
): Promise<T | OfflineResult> {
  await initStorage();

  const state = await NetInfo.fetch();
  const isOnline = !!state.isConnected && !!state.isInternetReachable;

  if (isOnline) {
    try {
      return await apiFn();
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  }

  const cachedUser = await getCachedUser();
  const canUseOffline = cachedUser && (await isOfflineSessionValid());

  if (!canUseOffline) {
    throw new Error(
      "Offline session is not available. Please reconnect and sign in again."
    );
  }

  const localId = `offline_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 11)}`;

  const payloadToSave = shouldPersistMedia(options.type)
    ? await persistOfflineMediaPayload(fallbackPayload)
    : fallbackPayload;

  const pending: Omit<PendingItem, "status" | "retryCount" | "lastAttempt"> = {
    id: localId,
    type: options.type,
    payload: payloadToSave,
    projectId: options.projectId,
    localMediaUris:
      options.localMediaUris ??
      extractLocalMediaUris(payloadToSave, options.type),
    createdAt: Date.now(),
  };

  await savePending(pending);

  return {
    offline: true,
    localId,
    message: "Saved offline - will sync when online",
  };
}

export function useSafeApiCall() {
  return async <T,>(
    apiFn: () => Promise<T>,
    fallbackPayload: any,
    options: Parameters<typeof safeApiCall>[2]
  ): Promise<T | OfflineResult> => {
    return safeApiCall(apiFn, fallbackPayload, options);
  };
}