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

import { isManualOfflineMode } from "./connectivityMode";

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

  const hasInternet =
    state.isConnected === true &&
    state.isInternetReachable !== false;

  const manualOffline = isManualOfflineMode();

  /*
   * Never execute apiFn while the user has selected Offline mode,
   * even when Wi-Fi or mobile data is available.
   */
  const canUseApi = hasInternet && !manualOffline;

  if (canUseApi) {
    try {
      return await apiFn();
    } catch (error) {
      console.error("API call failed:", error);

      /*
       * Keep this as throw for now.
       *
       * Later, we can decide whether temporary API/network errors should
       * automatically fall back to the offline queue.
       */
      throw error;
    }
  }

  const cachedUser = await getCachedUser();
  const canUseOffline =
    !!cachedUser && (await isOfflineSessionValid());

  if (!canUseOffline) {
    throw new Error(
      "Offline session is not available. Please reconnect and sign in again."
    );
  }

  let localId = Crypto.randomUUID();
  let pendingType = options.type;
  let payloadForQueue = fallbackPayload;

  const assetId = String(
    fallbackPayload?.assetId || ""
  );

  const isLocalAssetId =
    assetId.startsWith("offline_") ||
    assetId.includes("-");

  /*
   * When updating an asset that already has a pending queue item,
   * reuse that item rather than adding another pending operation.
   */
  if (options.type === "updateAsset" && assetId) {
    const existingPending =
      await getPendingAssetItem(
        assetId,
        options.projectId
      );

    if (existingPending) {
      localId = existingPending.id;
    }

    /*
     * An asset created offline does not exist on the server yet.
     * Editing it should update the queued createAsset payload rather
     * than queue an updateAsset request for a nonexistent remote ID.
     */
    if (isLocalAssetId) {
      pendingType = "createAsset";

      payloadForQueue = {
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

      delete payloadForQueue.assetId;
    }
  }

  const payloadToSave =
    shouldPersistMedia(pendingType)
      ? await persistOfflineMediaPayload(
          payloadForQueue
        )
      : payloadForQueue;

  const pending: Omit<
    PendingItem,
    "status" | "retryCount" | "lastAttempt"
  > = {
    id: localId,
    type: pendingType,
    payload: payloadToSave,
    projectId: options.projectId,

    localMediaUris:
      options.localMediaUris ??
      extractLocalMediaUris(
        payloadToSave,
        pendingType
      ),

    createdAt: Date.now(),
  };

  await savePending(pending);
  await markProjectNeedsSync(
    options.projectId
  );

  return {
    offline: true,
    localId,
    message: manualOffline
      ? "Saved offline. It will sync when you switch the app online."
      : "No internet connection. Saved offline and queued for sync.",
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