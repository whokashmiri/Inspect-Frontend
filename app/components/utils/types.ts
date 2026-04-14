export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export type AssetCondition = "" | "New" | "Used" | "Damaged";
export type AssetType = "Vehicle" | "Other";

export type AssetDraft = {
  images: Array<{
    uri: string;
    name: string;
    type: string;
  }>;
  name: string;
  writtenDescription: string;
  voiceNotes: Array<{
    uri: string;
    name: string;
    type: string;
  }>;
  condition?: AssetCondition;
  assetType?: AssetType;
  brand?: string;
  manufactureYear?: string;
  kilometersDriven?: string;
};