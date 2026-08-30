
//offline/index.ts
import { configureOfflineDb } from "./database";
import { initStorage } from "./storage";
import { initAssetGalleryStorage } from "./assetGalleryStorage";
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
  initAssetGalleryStorage,
  saveAssetTaxonomyOffline,
  getAssetTaxonomyOffline,
  clearAssetTaxonomyOffline,
  hasAssetTaxonomyOffline,
  getOfflineRecentAssets,
  markOfflineAssetUsed,
  getOfflineAssetGalleryData,
} from "./assetGalleryStorage";

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
   deletePendingCreateAssetByLocalId,
} from "./storage";


export { useIsOnline } from "./network";

export async function initOfflineSupport() {
  console.log("🚀 Initializing offline support...");

  // Configure the ONE shared SQLite connection first.
  await configureOfflineDb();

  // Keep initialization sequential.
  await initStorage();

  await initAssetGalleryStorage();

  await initAuthStorage();

  // Sync starts only after every storage module is ready.
  await initSync();

  console.log("✅ Offline support ready");
}