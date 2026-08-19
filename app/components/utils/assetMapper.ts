import { AssetItem } from "../../../api/api";
import { AssetDraft } from "./types";

const cleanAssetRawData = (rawData?: Record<string, any> | null) => {
  const source =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? { ...rawData }
      : {};

  delete source.quantity;
  delete source.asset_location;
  delete source.customAssetType;

  return source;
};

const isRemoteUrl = (value?: string | null) => {
  const text = String(value || "").trim().toLowerCase();

  return text.startsWith("http://") || text.startsWith("https://");
};

const mapExistingMediaItemToDraft = (
  item: any,
  index: number,
  fallbackPrefix: "image" | "voice"
) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const url = String(item.url || "").trim();
  const uri = String(item.uri || "").trim();

  if (!url && !uri) {
    return null;
  }

  const hasRemoteUrl = isRemoteUrl(url) || isRemoteUrl(uri);
  const hasPublicId = Boolean(item.publicId);

  const existing =
    hasRemoteUrl ||
    hasPublicId ||
    item.existing === true;

  const sourceType = String(
    item.type ||
      item.mimeType ||
      ""
  ).toLowerCase();

  const sourceUrl = String(url || uri).toLowerCase();

  const isVideo =
    item.mediaType === "video" ||
    sourceType.startsWith("video/") ||
    sourceUrl.includes("/video/upload/") ||
    sourceUrl.endsWith(".mp4") ||
    sourceUrl.endsWith(".mov");

  const fallbackMimeType =
    fallbackPrefix === "voice"
      ? "audio/m4a"
      : isVideo
      ? "video/mp4"
      : "image/jpeg";

  return {
    ...item,

    uri: uri || url,
    url: url || (isRemoteUrl(uri) ? uri : ""),

    name:
      item.name ||
      `${fallbackPrefix}_${index}`,

    type:
      item.type ||
      item.mimeType ||
      fallbackMimeType,

    mimeType:
      item.mimeType ??
      item.type ??
      fallbackMimeType,

    publicId: item.publicId ?? null,

    mediaType:
      fallbackPrefix === "voice"
        ? undefined
        : isVideo
        ? "video"
        : "image",

    thumbnailUrl: item.thumbnailUrl ?? null,
    duration: item.duration ?? null,

    existing,
  };
};

const mapExistingMediaToDraft = (
  items: any,
  fallbackPrefix: "image" | "voice"
) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) =>
      mapExistingMediaItemToDraft(
        item,
        index,
        fallbackPrefix
      )
    )
    .filter(Boolean);
};

const createEmptyAssetImages = () => ({
  main:null,
  plate: null,
  details: null,
  odometer: null,
  brand: null,
  other: [],
});

const mapAssetImagesToDraft = (images: any) => {
  const emptyImages = createEmptyAssetImages();

  if (!images) {
    return emptyImages;
  }

  // Support old assets that still have a flat images array.
  // Put them only in Other so no image is lost.
  if (Array.isArray(images)) {
    return {
      ...emptyImages,
      other: mapExistingMediaToDraft(
        images,
        "image"
      ),
    };
  }

  if (typeof images !== "object") {
    return emptyImages;
  }

  return {
    plate: mapExistingMediaItemToDraft(
      images.plate,
      0,
      "image"
    ),

    details: mapExistingMediaItemToDraft(
      images.details,
      1,
      "image"
    ),

    odometer: mapExistingMediaItemToDraft(
      images.odometer,
      2,
      "image"
    ),

    brand: mapExistingMediaItemToDraft(
      images.brand,
      3,
      "image"
    ),
     main: mapExistingMediaItemToDraft(
      images.main,
      4,
      "image"
    ),

    other: mapExistingMediaToDraft(
      images.other,
      "image"
    ),
  };
};

export function mapAssetToDraft(
  asset: AssetItem
): AssetDraft & {
  isDone: boolean;
  hasNotes?: boolean;
  notes?: string;
  quantity?: number;
  rawData?: Record<string, any>;
} {
  const quantityValue = Number(
    asset.quantity ?? 1
  );

  const quantity =
    Number.isFinite(quantityValue) &&
    quantityValue > 0
      ? Math.floor(quantityValue)
      : 1;

  const normalizedAssetType =
    String(asset.assetType || "").toLowerCase() ===
    "vehicle"
      ? "vehicle"
      : "other";

  return {
    name: asset.name || "",

    writtenDescription:
      (asset as any).writtenDescription || "",

    condition: asset.condition || "Good",

    assetType: normalizedAssetType,

    normalizedData:
  asset.normalizedData &&
  typeof asset.normalizedData === "object"
    ? { ...asset.normalizedData }
    : {},

newAssetLocation:
  asset.newAssetLocation ?? null,

    categoryId: asset.categoryId ?? null,
    category: asset.category ?? null,

    typeId: asset.typeId ?? null,
    type: asset.type ?? null,

    nameId: asset.nameId ?? null,

  

    quantity,

    rawData: cleanAssetRawData(
      asset.rawData
    ),

    brand: asset.brand || "",
    model: asset.model || "",

    code: asset.code || "",

    manufactureYear:
      asset.manufactureYear || "",

    kilometersDriven:
      asset.kilometersDriven || "",

    isPresent:
      asset.isPresent ?? true,

    isDone:
      asset.isDone ?? false,

    hasNotes:
      asset.hasNotes ??
      Boolean(
        String(asset.notes || "").trim()
      ),

    notes:
      asset.notes || "",

    images:
      mapAssetImagesToDraft(
        asset.images
      ),

    voiceNotes:
      mapExistingMediaToDraft(
        asset.voiceNotes,
        "voice"
      ),
  };
}