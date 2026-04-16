import { AssetItem } from "../../../api/api";
import { AssetDraft } from "./types";

export function mapAssetToDraft(asset: AssetItem): AssetDraft {
  return {
    name: asset.name,
    writtenDescription: asset.writtenDescription || "",
    condition: asset.condition || "",
    assetType: asset.assetType || "Other",
    brand: asset.brand || "",
    model: asset.model || "",
    manufactureYear: asset.manufactureYear || "",
    kilometersDriven: asset.kilometersDriven || "",
    images: asset.images.map((img, index) => ({
      uri: img.url,
      name: `asset_image_${index + 1}.jpg`,
      type: "image/jpeg",
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