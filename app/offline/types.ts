export type OfflineAction = 
  | 'createProject' 
  | 'createFolder' 
  | 'createAsset';

export interface PendingItem {
  id: string;
  type: OfflineAction;
  payload: any;  // Exact input to API function (CreateProjectPayload | CreateFolderPayload | CreateAssetPayload)
  projectId?: string;  // For UI grouping/context
  localImageUris?: string[];  // Local file paths for images/voice (pre-upload)
  createdAt: number;  // timestamp
  status: 'pending' | 'synced' | 'failed';
  retryCount?: number;
  lastAttempt?: number | null;
}

export interface OfflineResult {
  offline: true;
  localId: string;
  message: string;
}
