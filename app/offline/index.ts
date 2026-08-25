
//offline/index.ts
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
  await initStorage();
  await initAssetGalleryStorage();
  await initAuthStorage();
  await initSync();
  console.log("✅ Offline support ready");
}