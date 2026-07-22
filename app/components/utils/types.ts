import { AssetItem } from "../../../api/api";

// components/utils/types.ts

export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export type AssetCondition = string | null;

export type AssetType = "vehicle" | "other";

export type AssetMediaInput = {
  uri?: string;
  url?: string;
  name?: string;
  type?: string;

  publicId?: string | null;
  duration?: number | null;
  existing?: boolean;

  mediaType?: "image" | "video";
  mimeType?: string | null;
  thumbnailUrl?: string | null;
};

export type AssetImagesInput = {
  // Vehicle-only image slots
  plate: AssetMediaInput | null;
  odometer: AssetMediaInput | null;

  // Shared by vehicle and other assets
  details: AssetMediaInput | null;
  other: AssetMediaInput[];

  // Other-asset-only image slot
  brand: AssetMediaInput | null;
};

export type AssetDraft = {
  images: AssetImagesInput;

  name: string;
  writtenDescription: string;

  code?: string;
  rawData?: Record<string, any> | null;

  voiceNotes: AssetMediaInput[];

  condition?: AssetCondition;

  assetType?: AssetType;
  quantity?: number;
  subAssetType?: string;

  brand?: string;
  model?: string;
  manufactureYear?: string;
  kilometersDriven?: string;

  hasNotes?: boolean;
  notes?: string;

  isDone?: boolean;
  isPresent?: boolean;
};