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

const isRemoteUrl = (value?: string | null) => {
  const text = String(value || "").trim().toLowerCase();

  return text.startsWith("http://") || text.startsWith("https://");
};

const mapExistingMediaToDraft = (
  items: any[] = [],
  fallbackPrefix: "image" | "voice"
) => {
  return items.map((item: any, index: number) => {
    const url = String(item.url || "").trim();
    const uri = String(item.uri || "").trim();

    const hasRemoteUrl = isRemoteUrl(url) || isRemoteUrl(uri);
    const hasPublicId = !!item.publicId;

    const existing = hasRemoteUrl || hasPublicId || item.existing === true;

    return {
      ...item,

      // keep remote url when it exists
      uri: uri || url || "",
      url: url || (isRemoteUrl(uri) ? uri : ""),

      name: item.name || `${fallbackPrefix}_${index}`,
      type:
        item.type ||
        item.mimeType ||
        (fallbackPrefix === "voice" ? "audio/m4a" : "image/jpeg"),
      mimeType:
        item.mimeType ??
        item.type ??
        (fallbackPrefix === "voice" ? "audio/m4a" : "image/jpeg"),

      publicId: item.publicId ?? null,
      mediaType:
        item.mediaType ??
        (fallbackPrefix === "voice"
          ? undefined
          : item.type?.startsWith("video/")
          ? "video"
          : "image"),

      thumbnailUrl: item.thumbnailUrl ?? null,
      duration: item.duration ?? null,

      existing,
    };
  });
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

    writtenDescription: (asset as any).writtenDescription || "",

    condition: asset.condition || "Good",
    assetType: asset.assetType || "other",

    subAssetType: subAssetType || undefined,
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

    images: mapExistingMediaToDraft(asset.images || [], "image"),
    voiceNotes: mapExistingMediaToDraft(asset.voiceNotes || [], "voice"),
  };
}