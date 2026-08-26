

//offline/sync.ts

import NetInfo from "@react-native-community/netinfo";
import { projectApi, projectContentApi, authApi, tokenStore } from "../../api/api";
import {
  getPending,
  updateStatus,
  deletePending,
  updatePayload,
  getProjectSyncState,
  saveProjectSyncState,
  upsertOfflineAsset,
  deleteOfflineAssetsByIds,
} from "./storage";
import { deleteOfflineMediaFiles } from "./mediaStorage";
import { PendingItem , CachedUser } from "./types";
import {
  getCachedUser,
  getSessionMeta,
  isOfflineSessionValid,
  cacheAuthenticatedSession,
  getCachedCompanies,
} from "./authStorage";
import { isManualOfflineMode } from "./connectivityMode";

let isSyncing = false;

async function ensureValidSessionForSync(): Promise<boolean> {
  const state = await NetInfo.fetch();

  const isOnline =
    state.isConnected === true &&
    state.isInternetReachable !== false;

  if (!isOnline) {
    return false;
  }

  try {
    const token =
      await tokenStore.getToken();

    if (!token) {
      return false;
    }

    const user =
      await authApi.me();

    const cachedUser =
      await getCachedUser();

    const sessionMeta =
      await getSessionMeta();


    const role =
      user.role ??
      cachedUser?.role;

    if (!role) {
      throw new Error(
        "Authenticated user has no role.",
      );
    }

    const selectedCompanyId =
      cachedUser?.selectedCompanyId ??
      sessionMeta?.selectedCompanyId ??
      null;

    const companies =
      cachedUser
        ? await getCachedCompanies(
            cachedUser.id,
          )
        : [];

    const userForCache: CachedUser = {
      ...user,

      id: String(user.id),

      username:
        String(user.username),

      role,

      selectedCompanyId,
    };

    await cacheAuthenticatedSession({
      user: userForCache,

      accessToken:
        token,

      refreshToken:
        null,

      companies,

      selectedCompanyId,
    });

    return true;
  } catch (error) {
    console.warn(
      "[Sync] Could not refresh authenticated session",
      error,
    );

    return false
  }
}

async function patchPendingProjectRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[]
) {
  const queue = pendingItems ?? (await getPending("pending"));

  for (const item of queue) {
    const payload = item.payload as Record<string, unknown>;
    let updatedPayload = payload;
    let changed = false;

    if (payload?.projectId === localId) {
      updatedPayload = { ...updatedPayload, projectId: remoteId };
      changed = true;
    }

    if (changed) {
      await updatePayload(item.id, updatedPayload);
      item.payload = updatedPayload;
    }
  }
}

async function patchPendingFolderRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[]
) {
  const queue = pendingItems ?? (await getPending("pending"));

  for (const item of queue) {
    const payload = item.payload as Record<string, unknown>;
    let updatedPayload = payload;
    let changed = false;

    if (payload?.parentId === localId) {
      updatedPayload = { ...updatedPayload, parentId: remoteId };
      changed = true;
    }

    if (payload?.parent === localId) {
      updatedPayload = { ...updatedPayload, parent: remoteId };
      changed = true;
    }

    if (payload?.folderId === localId) {
      updatedPayload = { ...updatedPayload, folderId: remoteId };
      changed = true;
    }

    if (changed) {
      await updatePayload(item.id, updatedPayload);
      item.payload = updatedPayload;
    }
  }
}

async function patchPendingAssetRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[],
) {
  if (!localId || !remoteId || localId === remoteId) {
    return;
  }

  const queue =
    pendingItems ?? (await getPending("pending"));

  for (const item of queue) {
    const payload =
      item.payload as Record<string, any>;

    let updatedPayload = payload;
    let changed = false;

    if (payload?.assetId === localId) {
      updatedPayload = {
        ...updatedPayload,
        assetId: remoteId,
      };

      changed = true;
    }

    if (payload?.id === localId) {
      updatedPayload = {
        ...updatedPayload,
        id: remoteId,
      };

      changed = true;
    }

    if (changed) {
      await updatePayload(
        item.id,
        updatedPayload,
      );

      item.payload = updatedPayload;
    }
  }
}

async function markUploadedProjectNeedsDownload(projectId?: string) {
  if (!projectId) return;

  const state = await getProjectSyncState(projectId);

  await saveProjectSyncState({
    projectId,
    syncVersion: Number(state?.syncVersion || 0),
    needsSync: true,
    lastSyncAt: state?.lastSyncAt || null,
  });
}

async function processQueueItem(
  item: PendingItem,
  pendingItems?: PendingItem[]
): Promise<boolean> {
  try {
    switch (item.type) {
      case "createProject": {
        const result = await projectApi.create(item.payload as any);

        await patchPendingProjectRefs(
          item.id,
          result.project.id,
          pendingItems
        );

        break;
      }

      case "createFolder": {
        const result = await projectContentApi.createFolder(
          item.payload as any
        );

        await patchPendingFolderRefs(
          item.id,
          result.folder.id,
          pendingItems
        );

        break;
      }

case "createAsset": {
  const result =
    await projectContentApi.createAsset(
      item.payload as any,
    );

  const serverAsset =
    (result as any)?.asset ??
    result;

  const serverAssetId =
    String(
      serverAsset?.id ??
        serverAsset?._id ??
        "",
    ).trim();

  if (!serverAssetId) {
    throw new Error(
      `Server returned no asset for createAsset queue item ${item.id}`,
    );
  }

  const localAssetId =
    item.id;

  await patchPendingAssetRefs(
    localAssetId,
    serverAssetId,
    pendingItems,
  );

 
  await upsertOfflineAsset({
    ...serverAsset,
    id: serverAssetId,
  });

 
  if (
    localAssetId &&
    localAssetId !== serverAssetId
  ) {
    await deleteOfflineAssetsByIds([
      localAssetId,
    ]);
  }

  await deleteOfflineMediaFiles(
    item.payload,
  );

  break;
}

case "updateAsset": {
  const result =
    await projectContentApi.updateAsset(
      item.payload as any,
    );

  const serverAsset =
    (result as any)?.asset ??
    result;

  const serverAssetId =
    String(
      serverAsset?.id ??
        serverAsset?._id ??
        "",
    ).trim();

  if (!serverAssetId) {
    throw new Error(
      `Server returned no asset for updateAsset queue item ${item.id}`,
    );
  }

  await upsertOfflineAsset({
    ...serverAsset,
    id: serverAssetId,
  });

  await deleteOfflineMediaFiles(
    item.payload,
  );

  break;
}

case "deleteAsset": {
  const assetId =
    item.payload?.assetId ??
    item.payload?.id;

  if (!assetId) {
    throw new Error(
      `Missing assetId for deleteAsset queue item ${item.id}`,
    );
  }

  try {
    await projectContentApi.deleteAsset(
      assetId,
    );
  } catch (error: any) {
    const status =
      error?.response?.status ??
      error?.status;

    if (status !== 404) {
      throw error;
    }

    console.log(
      `Asset ${assetId} was already deleted on the server.`,
    );
  }

  await deleteOfflineAssetsByIds([
    String(assetId),
  ]);

  break;
}


      default:
        console.warn(
          "Unknown action type:",
          item.type
        );

        return false;
    }

    await updateStatus(item.id, "synced");
    await deletePending(item.id);

    await markUploadedProjectNeedsDownload(
      item.projectId
    );

    return true;
  } catch (error) {
    console.error(
      `Sync failed for ${item.id}:`,
      error
    );

    if ((item.retryCount ?? 0) < 3) {
      await updateStatus(
        item.id,
        "pending",
        (item.retryCount ?? 0) + 1,
        Date.now()
      );
    } else {
      await updateStatus(
        item.id,
        "failed",
        item.retryCount ?? 3,
        Date.now()
      );
    }

    return false;
  }
}



export async function syncQueue(): Promise<{
  synced: number;
  failed: number;
  pending: number;
}> {
  if (isSyncing) {
    const pendingItems = await getPending("pending");

    return {
      synced: 0,
      failed: 0,
      pending: pendingItems.length,
    };
  }

  /*
   * Lock immediately.
   *
   * This must happen before NetInfo.fetch(),
   * session validation, getPending(), or any other await.
   */
  isSyncing = true;

  try {
    if (isManualOfflineMode()) {
      console.log(
        "Sync skipped: manual offline mode is enabled.",
      );

      const pendingItems =
        await getPending("pending");

      return {
        synced: 0,
        failed: 0,
        pending: pendingItems.length,
      };
    }

    const net = await NetInfo.fetch();

    const hasInternet =
      net.isConnected === true &&
      net.isInternetReachable !== false;

    if (!hasInternet) {
      const pendingItems =
        await getPending("pending");

      return {
        synced: 0,
        failed: 0,
        pending: pendingItems.length,
      };
    }

 
    if (isManualOfflineMode()) {
      const pendingItems =
        await getPending("pending");

      return {
        synced: 0,
        failed: 0,
        pending: pendingItems.length,
      };
    }

    const canSync =
      await ensureValidSessionForSync();

    if (!canSync) {
      const pendingItems =
        await getPending("pending");

      return {
        synced: 0,
        failed: 0,
        pending: pendingItems.length,
      };
    }

 
    if (isManualOfflineMode()) {
      const pendingItems =
        await getPending("pending");

      return {
        synced: 0,
        failed: 0,
        pending: pendingItems.length,
      };
    }

    console.log("Starting sync...");

    const pending =
      await getPending("pending");

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      if (isManualOfflineMode()) {
        console.log(
          "Sync stopped: manual offline mode was enabled.",
        );
        break;
      }

      const currentNetwork =
        await NetInfo.fetch();

      const stillHasInternet =
        currentNetwork.isConnected === true &&
        currentNetwork.isInternetReachable !==
          false;

      if (!stillHasInternet) {
        console.log(
          "Sync stopped: internet connection was lost.",
        );
        break;
      }

      /*
       * Check once more after NetInfo because
       * the user may toggle Offline during it.
       */
      if (isManualOfflineMode()) {
        console.log(
          "Sync stopped: manual offline mode was enabled.",
        );
        break;
      }

      const success =
        await processQueueItem(item, pending);

      if (success) {
        synced++;
      } else {
        failed++;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 400),
      );
    }

    const remainingPending =
      await getPending("pending");

    if (synced > 0) {
      console.log(
        `Sync complete: ${synced} item(s) synced.`,
      );
    }

    return {
      synced,
      failed,
      pending: remainingPending.length,
    };
  } finally {
    /*
     * Always unlock, including early returns
     * and errors.
     */
    isSyncing = false;
  }
}

let unsubscribeSyncListener: (() => void) | null = null;

export function startSyncListener() {
  if (unsubscribeSyncListener) return;

  unsubscribeSyncListener = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await syncQueue();
    }
  });
}

export function stopSyncListener() {
  if (unsubscribeSyncListener) {
    unsubscribeSyncListener();
    unsubscribeSyncListener = null;
  }
}

export function triggerManualSync() {
  void syncQueue();
}

export async function initSync() {
  await syncQueue();
  startSyncListener();
}