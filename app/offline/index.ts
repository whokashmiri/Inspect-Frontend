import { initStorage } from "./storage";
import { initSync } from "./sync";

export * from "./types";
export * from "./wrapper";

export {
  initSync,
  syncQueue,
  triggerManualSync,
  startSyncListener,
} from "./sync";

export {
  initStorage,
  getPending,
  getPendingCount,
  getPendingByProjectId,
  getPendingCountByProjectId,
  saveProjectOffline,
  saveFoldersOffline,
  saveAssetsOffline,
  clearOfflineProject,
  isProjectDownloaded,
  getDownloadedProject,
  getOfflineContents,
  getAllDownloadedProjects,
  upsertOfflineFolder,
  upsertOfflineAsset,
  getOfflineAssetById,
} from "./storage";

export {
  useIsOnline
} from "./network";

export async function initOfflineSupport() {
  console.log("🚀 Initializing offline support...");
  await initStorage();
  await initSync();
  console.log("✅ Offline support ready");
}