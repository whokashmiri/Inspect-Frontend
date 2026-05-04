import { AssetItem } from "../../../api/api";

//components/utils/types.ts
export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export type AssetCondition = "" | "New" | "Used" | "Damaged" | "Good";
export type AssetType = "Vehicle" | "Other";

export type AssetMediaInput = {
  uri?: string;
  url?: string;
  name?: string;
  type?: string;
  publicId?: string | null;
  duration?: number | null;
  existing?: boolean;
};

export type AssetDraft = {
  images: AssetMediaInput[];
  name: string;
  writtenDescription: string;
  code?: string;
  rawData?: Record<string, any> | null;
  voiceNotes: AssetMediaInput[];
  condition?: AssetCondition;
  assetType?: AssetType;
  brand?: string;
  model?: string;
  manufactureYear?: string;
  kilometersDriven?: string;
  hasNotes?: boolean;
  notes?: string;
  isDone?: boolean;
  isPresent?: boolean;
};