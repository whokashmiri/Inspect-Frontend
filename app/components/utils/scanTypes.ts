export type ScanToggleKey =
  | "barcode"
  | "generalText"
  | "numbersOnly"
  | "carPlate";

export type SavedScanType =
  | "qr"
  | "barcode"
  | "text"
  | "odometer"
  | "plate";

export interface ScanToggles {
  barcode: boolean;
  generalText: boolean;
  numbersOnly: boolean;
  carPlate: boolean;
}

export interface ExtractedScanResult {
  type: SavedScanType;
  value: string;
  rawText?: string | null;
  imageUri?: string | null;
  createdAt?: string;
}

export interface ScannerModalResult {
  descriptionText: string;
  results: ExtractedScanResult[];
  imageUri?: string | null;
}