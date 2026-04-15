
//components/utils/types.ts
export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export type AssetCondition = "" | "New" | "Used" | "Damaged";
export type AssetType = "Vehicle" | "Other";

export type AssetDraft = {
  images: UploadFileInput[];
  name: string;
  writtenDescription: string;
  voiceNotes: UploadFileInput[];
  condition?: AssetCondition;
  assetType?: AssetType;
  brand?: string;
  model?: string;
  manufactureYear?: string;
  kilometersDriven?: string;
};