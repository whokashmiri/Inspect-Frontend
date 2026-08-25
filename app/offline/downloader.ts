// offline/downloader.ts

import {
  Project,
  FolderItem,
  AssetItem,
  projectContentApi,
} from "../../api/api";

import {
  initStorage,
  replaceOfflineProjectSnapshot,
} from "./storage";

import {
  assetCategoryApi,
} from "../../api/assetCategory.api";

import {
  saveAssetTaxonomyOffline,
  initAssetGalleryStorage,
} from "./assetGalleryStorage";


// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type DownloadedProjectTree = {
  folders: FolderItem[];
  assets: AssetItem[];
};

type ProjectTreeAccumulator = {
  folders: FolderItem[];
  assets: AssetItem[];

  visitedFolderIds: Set<string>;
  visitedAssetIds: Set<string>;
};


// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function normalizeFolder(
  folder: any,
): FolderItem {
  return {
    ...folder,

    parentId:
      folder?.parentId ??
      folder?.parent ??
      null,
  };
}


function normalizeText(
  value: any,
): string | null {
  const text =
    String(value || "").trim();

  return text || null;
}


function normalizeSubAssetType(
  value: any,
): string | null {
  const text =
    String(value || "")
      .trim()
      .toLowerCase();

  return text || null;
}


function normalizeQuantity(
  value: any,
): number {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 1
  ) {
    return 1;
  }

  return Math.floor(
    numberValue,
  );
}


function normalizeAsset(
  asset: any,
): AssetItem {
  const assetType =
    String(
      asset?.assetType || "",
    )
      .trim()
      .toLowerCase() ===
    "vehicle"
      ? "vehicle"
      : "other";

  const condition =
    normalizeText(
      asset?.condition,
    ) || "Good";

  const subAssetType =
    assetType === "vehicle"
      ? "vehicle"
      : normalizeSubAssetType(
          asset?.subAssetType ??
            asset?.rawData
              ?.subAssetType ??
            asset?.rawData
              ?.customAssetType,
        );

  const rawData =
    asset?.rawData &&
    typeof asset.rawData ===
      "object" &&
    !Array.isArray(
      asset.rawData,
    )
      ? {
          ...asset.rawData,
        }
      : {};

  delete rawData.quantity;
  delete rawData.subAssetType;
  delete rawData.customAssetType;

  return {
    ...asset,

    parent:
      asset?.parent ??
      asset?.folderId ??
      null,

    folderId:
      asset?.folderId ??
      asset?.parent ??
      null,

    assetType,

    condition,

    subAssetType,

    quantity:
      assetType === "vehicle"
        ? 1
        : normalizeQuantity(
            asset?.quantity,
          ),

    rawData,

    /*
     * Preserve authoritative server fields.
     */
    val_tech_id:
      typeof asset?.val_tech_id ===
      "number"
        ? asset.val_tech_id
        : null,

    client_code:
      normalizeText(
        asset?.client_code,
      ),

    code:
      normalizeText(
        asset?.code,
      ),

    employer:
      normalizeText(
        asset?.employer,
      ),

    asset_source:
      normalizeText(
        asset?.asset_source,
      ),

    createdBy:
      asset?.createdBy ?? null,

    updatedBy:
      asset?.updatedBy ?? null,

    createdAt:
      asset?.createdAt ?? null,

    updatedAt:
      asset?.updatedAt ?? null,
  } as AssetItem;
}


// -----------------------------------------------------------------------------
// Project tree download
// -----------------------------------------------------------------------------

async function collectProjectTree(
  projectId: string,
  parentId: string | null = null,
  acc?: ProjectTreeAccumulator,
): Promise<DownloadedProjectTree> {
  const bucket:
    ProjectTreeAccumulator =
    acc ?? {
      folders: [],
      assets: [],

      visitedFolderIds:
        new Set<string>(),

      visitedAssetIds:
        new Set<string>(),
    };

  const contents =
    await projectContentApi.listContents(
      projectId,
      parentId,
    );

  const newFolders:
    FolderItem[] = [];

  // ---------------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------------

  for (
    const rawFolder of
      contents?.folders ?? []
  ) {
    const folder =
      normalizeFolder(
        rawFolder,
      );

    const folderId =
      String(
        folder?.id || "",
      ).trim();

    if (!folderId) {
      continue;
    }

    /*
     * Prevent duplicate rows and recursive loops.
     */
    if (
      bucket.visitedFolderIds.has(
        folderId,
      )
    ) {
      continue;
    }

    bucket.visitedFolderIds.add(
      folderId,
    );

    bucket.folders.push(
      folder,
    );

    newFolders.push(
      folder,
    );
  }

  // ---------------------------------------------------------------------------
  // Assets
  // ---------------------------------------------------------------------------

  for (
    const rawAsset of
      contents?.assets ?? []
  ) {
    const asset =
      normalizeAsset(
        rawAsset,
      );

    const assetId =
      String(
        asset?.id || "",
      ).trim();

    if (!assetId) {
      continue;
    }

    if (
      bucket.visitedAssetIds.has(
        assetId,
      )
    ) {
      continue;
    }

    bucket.visitedAssetIds.add(
      assetId,
    );

    bucket.assets.push(
      asset,
    );
  }

  // ---------------------------------------------------------------------------
  // Children
  // ---------------------------------------------------------------------------

  /*
   * Keep this sequential.
   *
   * It avoids firing a very large number of
   * folder-content requests simultaneously on mobile.
   */
  for (
    const folder of
      newFolders
  ) {
    await collectProjectTree(
      projectId,
      folder.id,
      bucket,
    );
  }

  return {
    folders:
      bucket.folders,

    assets:
      bucket.assets,
  };
}


// -----------------------------------------------------------------------------
// Download project
// -----------------------------------------------------------------------------

export async function downloadProjectForOffline(
  project: Project,
) {
  // ---------------------------------------------------------------------------
  // Validate before doing anything
  // ---------------------------------------------------------------------------

  const projectId =
    String(
      project?.id || "",
    ).trim();

  if (!projectId) {
    throw new Error(
      "Cannot download project without a project ID.",
    );
  }

  await initStorage();
  await initAssetGalleryStorage();

  // ---------------------------------------------------------------------------
  // Download remote data first
  // ---------------------------------------------------------------------------

  /*
   * Nothing currently cached is deleted at this point.
   *
   * If either request fails, the previous offline
   * project remains untouched.
   */
  const [
    tree,
    taxonomy,
  ] = await Promise.all([
    collectProjectTree(
      projectId,
      null,
    ),

    assetCategoryApi.getAll(),
  ]);

  // ---------------------------------------------------------------------------
  // Validate downloaded project
  // ---------------------------------------------------------------------------

  if (
    !tree ||
    !Array.isArray(
      tree.folders,
    ) ||
    !Array.isArray(
      tree.assets,
    )
  ) {
    throw new Error(
      "Invalid project data received while preparing offline download.",
    );
  }

  // ---------------------------------------------------------------------------
  // Validate taxonomy
  // ---------------------------------------------------------------------------

  if (
    !taxonomy ||
    !Array.isArray(
      taxonomy.categories,
    ) ||
    !Array.isArray(
      taxonomy.types,
    ) ||
    !Array.isArray(
      taxonomy.names,
    )
  ) {
    throw new Error(
      "Invalid asset taxonomy received while preparing offline download.",
    );
  }

  const taxonomyData = {
    categories:
      taxonomy.categories,

    types:
      taxonomy.types,

    names:
      taxonomy.names,
  };

  // ---------------------------------------------------------------------------
  // Cache global taxonomy
  // ---------------------------------------------------------------------------

  /*
   * Taxonomy is independent from one specific project.
   *
   * AssetGalleryScreen uses this cache when offline.
   */
  await saveAssetTaxonomyOffline(
    taxonomyData,
  );

  // ---------------------------------------------------------------------------
  // Replace project snapshot atomically
  // ---------------------------------------------------------------------------

  /*
   * This function should perform:
   *
   * BEGIN TRANSACTION
   *
   * delete old project
   * delete old folders
   * delete old assets
   *
   * insert project
   * insert folders
   * insert assets
   *
   * COMMIT
   *
   * If anything fails:
   *
   * ROLLBACK
   *
   * Therefore the user never ends up with a partially
   * downloaded offline project.
   */
  await replaceOfflineProjectSnapshot({
    project: {
      ...project,
      id: projectId,
    },

    folders:
      tree.folders,

    assets:
      tree.assets,
  });

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------

  return {
    projectId,

    folderCount:
      tree.folders.length,

    assetCount:
      tree.assets.length,

    taxonomy: {
      categoryCount:
        taxonomy.categories.length,

      typeCount:
        taxonomy.types.length,

      nameCount:
        taxonomy.names.length,
    },
  };
}