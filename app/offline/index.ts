
//offline/index.ts
import { initStorage } from "./storage";
import { initSync, syncQueue, triggerManualSync, startSyncListener, stopSyncListener } from "./sync";
import { initAuthStorage } from "./authStorage";

export * from "./types";
export * from "./wrapper";
export * from "./authStorage";

export {
  initSync,
  syncQueue,
  triggerManualSync,
  startSyncListener,
  stopSyncListener,
} from "./sync";

export {
  initStorage,
  getPending,
  getPendingCount,
  getPendingByProjectId,
  getPendingCountByProjectId,
  getPendingAssetItemId,
  saveProjectOffline,
  saveFoldersOffline,
  saveAssetsOffline,
  clearOfflineProject,
  clearOfflineProjectContents,
  isProjectDownloaded,
  getDownloadedProject,
  getOfflineContents,
  getAllDownloadedProjects,
  getDownloadedProjectsByCompany,
  upsertOfflineFolder,
  upsertOfflineAsset,
  getOfflineAssetById,
  updatePayload,
  advancedSearchOfflineAssets,
  getOfflineRawDataKeys,
  getOfflineConditions,
  getOfflineSubAssetTypes,
  renameOfflineSubAssetType,
  getProjectSyncState,
  saveProjectSyncState,
  getProjectsNeedingSync,
  deleteOfflineFoldersByIds,
  deleteOfflineAssetsByIds,
} from "./storage";


export { useIsOnline } from "./network";

export async function initOfflineSupport() {
  console.log("🚀 Initializing offline support...");
  await initStorage();
  await initAuthStorage();
  await initSync();
  console.log("✅ Offline support ready");
}