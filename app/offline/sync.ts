import { Alert } from "react-native";
import { projectApi, projectContentApi } from "../../api/api";
import { getPending, updateStatus, deletePending, updatePayload } from "./storage";
import { PendingItem } from "./types";
import NetInfo from "@react-native-community/netinfo";

let isSyncing = false;

async function patchPendingProjectRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[]
) {
  const queue = pendingItems ?? (await getPending("pending"));
  const updatePromises: Promise<void>[] = [];

  for (const item of queue) {
    const payload = item.payload as Record<string, unknown>;
    if (payload?.projectId === localId) {
      const updatedPayload = { ...payload, projectId: remoteId };
      updatePromises.push(updatePayload(item.id, updatedPayload));
      item.payload = updatedPayload;
    }
  }

  await Promise.all(updatePromises);
}

async function patchPendingFolderRefs(
  localId: string,
  remoteId: string,
  pendingItems?: PendingItem[]
) {
  const queue = pendingItems ?? (await getPending("pending"));
  const updatePromises: Promise<void>[] = [];

  for (const item of queue) {
    const payload = item.payload as Record<string, unknown>;
    let updatedPayload = payload;
    let changed = false;

    if (payload?.parentId === localId) {
      updatedPayload = { ...updatedPayload, parentId: remoteId };
      changed = true;
    }

    if (payload?.folderId === localId) {
      updatedPayload = { ...updatedPayload, folderId: remoteId };
      changed = true;
    }

    if (changed) {
      updatePromises.push(updatePayload(item.id, updatedPayload));
      item.payload = updatedPayload;
    }
  }

  await Promise.all(updatePromises);
}

async function processQueueItem(
  item: PendingItem,
  pendingItems?: PendingItem[]
): Promise<boolean> {
  try {
    switch (item.type) {
      case "createProject": {
        const projectResult = await projectApi.create(item.payload as any);
        await patchPendingProjectRefs(item.id, projectResult.project.id, pendingItems);
        break;
      }

      case "createFolder": {
        const folderResult = await projectContentApi.createFolder(item.payload as any);
        await patchPendingFolderRefs(item.id, folderResult.folder.id, pendingItems);
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
  } catch (error: any) {
    console.error(`Sync failed for ${item.id}:`, error);

    if ((item.retryCount ?? 0) < 3) {
      await updateStatus(item.id, "pending", (item.retryCount || 0) + 1, Date.now());
      return false;
    } else {
      await updateStatus(item.id, "failed");
      return false;
    }
  }
}

export async function syncQueue(): Promise<{
  synced: number;
  failed: number;
  pending: number;
}> {
  if (isSyncing) return { synced: 0, failed: 0, pending: 0 };

  const wasOnline = await NetInfo.fetch().then((s) => s.isConnected ?? false);
  if (!wasOnline) return { synced: 0, failed: 0, pending: 0 };

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

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (synced > 0) {
      Alert.alert("Sync Complete", `${synced} items synced!`);
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed, pending: pending.length - synced - failed };
  } finally {
    isSyncing = false;
  }
}

export function startSyncListener() {
  NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await syncQueue();
    }
  });
}

export function triggerManualSync() {
  syncQueue();
}

export async function initSync() {
  await syncQueue();
  startSyncListener();
}