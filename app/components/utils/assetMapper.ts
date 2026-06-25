import { AssetItem } from "../../../api/api";
import { AssetDraft } from "./types";

const cleanAssetRawData = (rawData?: Record<string, any> | null) => {
  const source =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? { ...rawData }
      : {};

  delete source.quantity;
  delete source.subAssetType;
  delete source.customAssetType;

  return source;
};

export function mapAssetToDraft(
  asset: AssetItem
): AssetDraft & {
  isDone: boolean;
  hasNotes?: boolean;
  notes?: string;
  quantity?: number;
  subAssetType?: string | null;
  rawData?: Record<string, any>;
} {
  const quantityValue = Number((asset as any).quantity ?? 1);

  const quantity =
    Number.isFinite(quantityValue) && quantityValue > 0
      ? Math.floor(quantityValue)
      : 1;

  const subAssetType = String((asset as any).subAssetType || "")
    .trim()
    .toLowerCase();

  return {
    name: asset.name,

    // keep for old type compatibility, but backend no longer uses it
    writtenDescription: (asset as any).writtenDescription || "",

    condition: asset.condition || "",
    assetType: asset.assetType || "other",

    subAssetType: subAssetType || null,
    quantity,

    rawData: cleanAssetRawData((asset as any).rawData),

    brand: asset.brand || "",
    model: asset.model || "",
    manufactureYear: asset.manufactureYear || "",
    kilometersDriven: asset.kilometersDriven || "",

    isPresent: asset.isPresent,
    isDone: asset.isDone || false,

    hasNotes: asset.hasNotes ?? false,
    notes: asset.notes || "",

    images: asset.images.map((img, index) => ({
      uri: img.url,
      name: `asset_image_${index + 1}.jpg`,
      type: img.mimeType || "image/jpeg",
      existing: true,
    })),

    voiceNotes: asset.voiceNotes.map((note, index) => ({
      uri: note.url,
      name: `voice_note_${index + 1}.m4a`,
      type: "audio/m4a",
      existing: true,
    })),
  };
}