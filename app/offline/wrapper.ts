import NetInfo from "@react-native-community/netinfo";
import { savePending, initStorage } from "./storage";
import { PendingItem, OfflineResult, OfflineAction } from "./types";

function extractLocalMediaUris(payload: any, type: OfflineAction): string[] {
  if (type !== "createAsset" || !payload) return [];

  const imageUris =
    Array.isArray(payload.images)
      ? payload.images
          .map((item: any) => item?.uri)
          .filter((uri: any) => typeof uri === "string")
      : [];

  const voiceUris =
    Array.isArray(payload.voiceNotes)
      ? payload.voiceNotes
          .map((item: any) => item?.uri)
          .filter((uri: any) => typeof uri === "string")
      : [];

  return [...imageUris, ...voiceUris];
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

  const localId = `offline_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 11)}`;

  const pending: Omit<PendingItem, "status" | "retryCount" | "lastAttempt"> = {
    id: localId,
    type: options.type,
    payload: fallbackPayload,
    projectId: options.projectId,
    localMediaUris:
      options.localMediaUris ?? extractLocalMediaUris(fallbackPayload, options.type),
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
  ): Promise<T | OfflineResult> => safeApiCall(apiFn, fallbackPayload, options);
}