import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { projectApi, projectContentApi, authApi, tokenStore } from "../../api/api";
import { getPending, updateStatus, deletePending, updatePayload } from "./storage";
import { PendingItem } from "./types";
import {
  getCachedUser,
  getSessionMeta,
  isOfflineSessionValid,
  cacheAuthenticatedSession,
  getCachedCompanies,
} from "./authStorage";

let isSyncing = false;

async function ensureValidSessionForSync(): Promise<boolean> {
  const state = await NetInfo.fetch();
  const isOnline = !!state.isConnected && !!state.isInternetReachable;
  if (!isOnline) return false;

  try {
    const token = await tokenStore.getToken();
    if (!token) return false;

    const user = await authApi.me();
    const cachedUser = await getCachedUser();
    const companies = cachedUser ? await getCachedCompanies(cachedUser.id) : [];

    await cacheAuthenticatedSession({
      user: {
        ...user,
        selectedCompanyId:
          cachedUser?.selectedCompanyId ??
          (await getSessionMeta())?.selectedCompanyId ??
          null,
      },
      accessToken: token,
      refreshToken: null,
      companies,
      selectedCompanyId:
        cachedUser?.selectedCompanyId ??
        (await getSessionMeta())?.selectedCompanyId ??
        null,
    });

    return true;
  } catch (error: any) {
    const validOffline = await isOfflineSessionValid();
    return validOffline;
  }
}

async function patchPendingProjectRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[]
) {
  const queue = pendingItems ?? (await getPending("pending"));
  const updates: Promise<void>[] = [];

  for (const item of queue) {
    const payload = item.payload as Record<string, unknown>;
    if (payload?.projectId === localId) {
      const updatedPayload = { ...payload, projectId: remoteId };
      updates.push(updatePayload(item.id, updatedPayload));
      item.payload = updatedPayload;
    }
  }

  await Promise.all(updates);
}

async function patchPendingFolderRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[]
) {
  const queue = pendingItems ?? (await getPending("pending"));
  const updates: Promise<void>[] = [];

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

    if (changed) {
      updates.push(updatePayload(item.id, updatedPayload));
      item.payload = updatedPayload;
    }
  }

  await Promise.all(updates);
}

async function processQueueItem(
  item: PendingItem,
  pendingItems?: PendingItem[]
): Promise<boolean> {
  try {
    switch (item.type) {
      case "createProject": {
        const result = await projectApi.create(item.payload as any);
        await patchPendingProjectRefs(item.id, result.project.id, pendingItems);
        break;
      }

      case "createFolder": {
        const result = await projectContentApi.createFolder(item.payload as any);
        await patchPendingFolderRefs(item.id, result.folder.id, pendingItems);
        break;
      }

      case "createAsset": {
        await projectContentApi.createAsset(item.payload as any);
        break;
      }

      case "updateAsset": {
        await projectContentApi.updateAsset(item.payload as any);
        break;
      }

      default:
        console.warn("Unknown action type:", item.type);
        return false;
    }

    await updateStatus(item.id, "synced");
    await deletePending(item.id);
    return true;
  } catch (error) {
    console.error(`Sync failed for ${item.id}:`, error);

    if ((item.retryCount ?? 0) < 3) {
      await updateStatus(item.id, "pending", (item.retryCount ?? 0) + 1, Date.now());
    } else {
      await updateStatus(item.id, "failed", item.retryCount ?? 3, Date.now());
    }

    return false;
  }
}

export async function syncQueue(): Promise<{
  synced: number;
  failed: number;
  pending: number;
}> {
  if (isSyncing) return { synced: 0, failed: 0, pending: 0 };

  const net = await NetInfo.fetch();
  const isOnline = !!net.isConnected && !!net.isInternetReachable;
  if (!isOnline) return { synced: 0, failed: 0, pending: 0 };

  const canSync = await ensureValidSessionForSync();
  if (!canSync) {
    return { synced: 0, failed: 0, pending: 0 };
  }

  isSyncing = true;
  console.log("🛜 Starting sync...");

  try {
    const pending = await getPending("pending");
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      const success = await processQueueItem(item, pending);
      if (success) synced++;
      else failed++;

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    if (synced > 0) {
      Alert.alert("Sync Complete", `${synced} item(s) synced.`);
    }

    return {
      synced,
      failed,
      pending: Math.max(0, pending.length - synced - failed),
    };
  } finally {
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