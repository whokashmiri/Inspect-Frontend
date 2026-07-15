// offline/downloader.ts
import {
  Project,
  FolderItem,
  AssetItem,
  projectContentApi,
} from "../../api/api";
import {
  clearOfflineProject,
  saveProjectOffline,
  saveFoldersOffline,
  saveAssetsOffline,
  initStorage,
} from "./storage";

type DownloadedProjectTree = {
  folders: FolderItem[];
  assets: AssetItem[];
};

function normalizeFolder(folder: any): FolderItem {
  return {
    ...folder,
    parentId: folder.parentId ?? folder.parent ?? null,
  };
}

function normalizeText(value: any): string | null {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeSubAssetType(value: any): string | null {
  const text = String(value || "").trim().toLowerCase();
  return text || null;
}

function normalizeQuantity(value: any): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 1) {
    return 1;
  }

  return Math.floor(numberValue);
}

function normalizeAsset(asset: any): AssetItem {
  const assetType =
    String(asset?.assetType || "").trim().toLowerCase() === "vehicle"
      ? "vehicle"
      : "other";

  const condition = normalizeText(asset?.condition) || "Good";

  const subAssetType =
    assetType === "vehicle"
      ? "vehicle"
      : normalizeSubAssetType(
          asset?.subAssetType ??
            asset?.rawData?.subAssetType ??
            asset?.rawData?.customAssetType
        );

  const rawData =
    asset?.rawData && typeof asset.rawData === "object" && !Array.isArray(asset.rawData)
      ? { ...asset.rawData }
      : {};

  delete rawData.quantity;
  delete rawData.subAssetType;
  delete rawData.customAssetType;

  return {
    ...asset,
    parent: asset.parent ?? asset.folderId ?? null,
    folderId: asset.folderId ?? asset.parent ?? null,

    assetType,
    condition,
    subAssetType,
    quantity: assetType === "vehicle" ? 1 : normalizeQuantity(asset?.quantity),
    rawData,
  };
}

async function collectProjectTree(
  projectId: string,
  parentId: string | null = null,
  acc?: DownloadedProjectTree
): Promise<DownloadedProjectTree> {
  const bucket: DownloadedProjectTree = acc ?? {
    folders: [],
    assets: [],
  };
// console.log("Fetching folder:", parentId);

  const contents = await projectContentApi.listContents(projectId, parentId);
  // console.log("Folders:", contents.folders?.length || 0);
// console.log("Assets:", contents.assets?.length || 0);

  if (contents.folders?.length) {
    bucket.folders.push(...contents.folders.map(normalizeFolder));
  }

  if (contents.assets?.length) {
    bucket.assets.push(...contents.assets.map(normalizeAsset));
  }

  for (const folder of contents.folders ?? []) {
    await collectProjectTree(projectId, folder.id, bucket);
  }

  return bucket;
}

export async function downloadProjectForOffline(project: Project) {
  await initStorage();

  await clearOfflineProject(project.id);
  await saveProjectOffline(project);

  const tree = await collectProjectTree(project.id, null);

  await saveFoldersOffline(tree.folders);
  await saveAssetsOffline(tree.assets);

  return {
    projectId: project.id,
    folderCount: tree.folders.length,
    assetCount: tree.assets.length,
  };
}