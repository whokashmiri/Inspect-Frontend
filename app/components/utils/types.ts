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
  main: AssetMediaInput | null;
  details: AssetMediaInput | null;
  other: AssetMediaInput[];

  // Other-asset-only image slot
  brand: AssetMediaInput | null;
};

export type AssetDraft = {
  images: AssetImagesInput;

  name: string;
  writtenDescription: string;
  val_tech_id?: number | null;
  client_code?: string | null;
  employer?: string | null;

  code?: string;
  rawData?: Record<string, any> | null;

  voiceNotes: AssetMediaInput[];

  condition?: AssetCondition;

  assetType?: AssetType;
  quantity?: number;
  categoryId?: string | null;
category?: string | null;

typeId?: string | null;
type?: string | null;

nameId?: string | null;

normalizedData?: Record<string, any> | null;

newAssetLocation?: string | null;

  brand?: string;
  model?: string;
  manufactureYear?: string;
  kilometersDriven?: string;

  hasNotes?: boolean;
  notes?: string;

  isDone?: boolean;
  isPresent?: boolean;
};