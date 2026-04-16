export type OfflineAction =
  | "createProject"
  | "createFolder"
  | "createAsset"
  | "updateAsset";

export interface PendingItem {
  id: string;
  type: OfflineAction;
  payload: Record<string, any>;
  projectId?: string;
  localMediaUris?: string[];
  createdAt: number;
  status: "pending" | "synced" | "failed";
  retryCount?: number;
  lastAttempt?: number | null;
}

export interface OfflineResult {
  offline: true;
  localId: string;
  message: string;
}

export interface OfflineProjectRecord {
  id: string;
  data: string;
  downloadedAt: number;
}

export interface OfflineFolderRecord {
  id: string;
  projectId: string;
  parentId: string | null;
  data: string;
}

export interface OfflineAssetRecord {
  id: string;
  projectId: string;
  folderId: string | null;
  data: string;
}