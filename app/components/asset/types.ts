export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export type AssetDraft = {
  images: UploadFileInput[];
  serialNumber: string;
  name: string;
  writtenDescription: string;
  voiceNotes: UploadFileInput[];
};