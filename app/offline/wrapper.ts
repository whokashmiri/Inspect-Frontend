// offline/wrapper.ts
import NetInfo from "@react-native-community/netinfo";
import {
  savePending,
  initStorage,
  getPendingAssetItemId,
  getPendingAssetItem,
  getProjectSyncState,
  saveProjectSyncState,
  getDownloadedProject,
} from "./storage";
import { PendingItem, OfflineResult, OfflineAction } from "./types";
import { getCachedUser, isOfflineSessionValid } from "./authStorage";
import { persistOfflineMediaPayload } from "./mediaStorage";

import * as Crypto from "expo-crypto";



type OfflineMediaItem = {
  uri?: string;
  [key: string]: any;
};

type OfflineAssetImages = {
  plate?: OfflineMediaItem | null;
  details?: OfflineMediaItem | null;
  odometer?: OfflineMediaItem | null;
  brand?: OfflineMediaItem | null;
  other?: OfflineMediaItem[];
};

function flattenOfflineAssetImages(
  images?: OfflineAssetImages | OfflineMediaItem[] | null
): OfflineMediaItem[] {
  if (!images) return [];

  // Backward compatibility with old saved payloads.
  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  const result: OfflineMediaItem[] = [];

  if (images.plate) {
    result.push(images.plate);
  }

  if (images.details) {
    result.push(images.details);
  }

  if (images.odometer) {
    result.push(images.odometer);
  }

  if (images.brand) {
    result.push(images.brand);
  }

  if (Array.isArray(images.other)) {
    result.push(...images.other.filter(Boolean));
  }

  return result;
}

function isLocalMediaUri(uri: unknown): uri is string {
  return (
    typeof uri === "string" &&
    uri.length > 0 &&
    !uri.startsWith("http://") &&
    !uri.startsWith("https://") &&
    !uri.startsWith("//")
  );
}

function extractLocalMediaUris(
  payload: any,
  type: OfflineAction
): string[] {
  if (
    (type !== "createAsset" && type !== "updateAsset") ||
    !payload
  ) {
    return [];
  }

  const imageUris = flattenOfflineAssetImages(payload.images)
    .map((item) => item?.uri)
    .filter(isLocalMediaUri);

  const voiceUris = (
    Array.isArray(payload.voiceNotes)
      ? payload.voiceNotes
      : []
  )
    .map((item: any) => item?.uri)
    .filter(isLocalMediaUri);

  return [...imageUris, ...voiceUris];
}
function shouldPersistMedia(type: OfflineAction) {
  return type === "createAsset" || type === "updateAsset";
}


async function markProjectNeedsSync(projectId?: string) {
  if (!projectId) return;

  const existingState = await getProjectSyncState(projectId);
  const downloadedProject = await getDownloadedProject(projectId);

  const syncVersion = Math.max(
    Number(existingState?.syncVersion || 0),
    Number(downloadedProject?.syncVersion || 0)
  );

  await saveProjectSyncState({
    projectId,
    syncVersion,
    needsSync: true,
    lastSyncAt: existingState?.lastSyncAt || null,
  });
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
  await markProjectNeedsSync(options.projectId);

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