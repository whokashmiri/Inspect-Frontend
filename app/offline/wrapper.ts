// offline/wrapper.ts

import NetInfo from "@react-native-community/netinfo";
import { savePending, initStorage, getPendingAssetItemId , getPendingAssetItem } from "./storage";
import { PendingItem, OfflineResult, OfflineAction } from "./types";
import { getCachedUser, isOfflineSessionValid } from "./authStorage";
import { persistOfflineMediaPayload } from "./mediaStorage";

import * as Crypto from "expo-crypto";



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

  // For updateAsset, check if there's already a pending item for this asset
  // to avoid incrementing sync count for multiple edits of the same asset
let localId = Crypto.randomUUID();
let pendingType = options.type;

const assetId = String(fallbackPayload?.assetId || "");

const isLocalAssetId =
  assetId.startsWith("offline_") || assetId.includes("-");

if (options.type === "updateAsset" && assetId) {
   const existingPending = await getPendingAssetItem(assetId, options.projectId);

  if (existingPending) {
    localId = existingPending.id;
  }

  if (isLocalAssetId) {
    pendingType = "createAsset";

    fallbackPayload = {
       ...(existingPending?.payload || {}),
      ...fallbackPayload,
      offlineId: assetId,


       parent:
        fallbackPayload.parent ??
        existingPending?.payload?.parent ??
        existingPending?.payload?.folderId ??
        null,

      folderId:
        fallbackPayload.folderId ??
        existingPending?.payload?.folderId ??
        existingPending?.payload?.parent ??
        null,
    };

    delete fallbackPayload.assetId;
  }
}
const payloadToSave = shouldPersistMedia(pendingType)
  ? await persistOfflineMediaPayload(fallbackPayload)
  : fallbackPayload;

const pending: Omit<PendingItem, "status" | "retryCount" | "lastAttempt"> = {
  id: localId,
  type: pendingType,
  payload: payloadToSave,
  projectId: options.projectId,
  localMediaUris:
    options.localMediaUris ??
    extractLocalMediaUris(payloadToSave, pendingType),
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