import { Alert } from 'react-native';
import { projectApi, projectContentApi } from '../../api/api';
import { getPending, updateStatus, deletePending, updatePayload } from './storage';
import { PendingItem } from './types';
import NetInfo from '@react-native-community/netinfo';

let isSyncing = false;

async function patchPendingProjectRefs(localId: string, remoteId: string) {
  const pendingItems = await getPending('pending');
  const updatePromises: Promise<void>[] = [];

  for (const item of pendingItems) {
    const payload = item.payload as Record<string, unknown>;
    if (payload?.projectId === localId) {
      updatePromises.push(updatePayload(item.id, { ...payload, projectId: remoteId }));
    }
  }

  await Promise.all(updatePromises);
}

async function processQueueItem(item: PendingItem): Promise<boolean> {
  try {
    switch (item.type) {
      case 'createProject':
        const projectResult = await projectApi.create(item.payload);
        await patchPendingProjectRefs(item.id, projectResult.project.id);
        break;
      
      case 'createFolder':
        await projectContentApi.createFolder(item.payload);
        break;
      
      case 'createAsset': {
        // Same payload as original (local URIs → backend Cloudinary)
        await projectContentApi.createAsset(item.payload);
        break;
      }
      
      default:
        console.warn('Unknown action type:', item.type);
        return false;
    }

    // Success
    await updateStatus(item.id, 'synced');
    await deletePending(item.id);
    return true;
    
  } catch (error: any) {
    console.error(`Sync failed for ${item.id}:`, error);
    
    // Retry logic: max 3 attempts
    if (item.retryCount! < 3) {
      await updateStatus(item.id, 'pending', (item.retryCount || 0) + 1, Date.now());
      return false;
    } else {
      await updateStatus(item.id, 'failed');
      return false;
    }
  }
}

export async function syncQueue(): Promise<{ synced: number; failed: number; pending: number }> {
  if (isSyncing) return { synced: 0, failed: 0, pending: 0 };

  const wasOnline = await NetInfo.fetch().then(s => s.isConnected ?? false);
  if (!wasOnline) return { synced: 0, failed: 0, pending: 0 };

  isSyncing = true;
  console.log('🛜 Starting sync...');

  try {
    const pending = await getPending('pending');
    let synced = 0, failed = 0;

    for (const item of pending) {
      const success = await processQueueItem(item);
      if (success) synced++;
      else failed++;
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    if (synced > 0) {
      Alert.alert('Sync Complete', `${synced} items synced!`);
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed, pending: pending.length - synced - failed };
    
  } finally {
    isSyncing = false;
  }
}

// Auto-sync listener (call when online changes)
export function startSyncListener() {
  NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await syncQueue();
    }
  });
}

// Manual trigger (for UI button if needed)
export function triggerManualSync() {
  syncQueue();
}

// Init for App.tsx
export async function initSync() {
  await syncQueue();  // Sync any pending on app start
  startSyncListener();
}
