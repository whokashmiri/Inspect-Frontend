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

function normalizeAsset(asset: any): AssetItem {
  return {
    ...asset,
    parent: asset.parent ?? asset.folderId ?? null,
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

  const contents = await projectContentApi.listContents(projectId, parentId);

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