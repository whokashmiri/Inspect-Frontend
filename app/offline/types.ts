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
  userId?: string | null;
  companyId?: string | null;
}

export interface OfflineFolderRecord {
  id: string;
  projectId: string;
  parentId: string | null;
  data: string;
  userId?: string | null;
  companyId?: string | null;
}

export interface OfflineAssetRecord {
  id: string;
  projectId: string;
  parent: string | null;
  data: string;
  userId?: string | null;
  companyId?: string | null;
}

export interface CachedCompany {
  id: string;
  name: string;
  [key: string]: any;
}


export type AppRole =
  | "Manager"
  | "Inspector"
  | "Valuator"
  | "company_admin";

export interface CachedUser {
  id: string;
  username: string;
  companyName: string | null;
  role: AppRole | null;
  isBlocked?: boolean;
  [key: string]: any;
}


export interface OfflineSessionMeta {
  userId: string;
  username: string;
  lastOnlineAuthAt: number;
  offlineAllowedUntil: number;
  selectedCompanyId?: string | null;
}




