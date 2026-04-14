export type OfflineAction =
  | "createProject"
  | "createFolder"
  | "createAsset";

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