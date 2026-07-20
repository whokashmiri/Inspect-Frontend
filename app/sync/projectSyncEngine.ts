import NetInfo from "@react-native-community/netinfo";
import { projectApi, Project } from "../../api/api";
import { syncQueue } from "../offline/sync";
import {
  saveProjectOffline,
  saveFoldersOffline,
  saveAssetsOffline,
  getDownloadedProject,
  getProjectSyncState,
  saveProjectSyncState,
  deleteOfflineFoldersByIds,
  deleteOfflineAssetsByIds,
  clearOfflineProjectContents,
} from "../offline/storage";

type QueueProjectSyncInput = {
  projectId: string;
  serverSyncVersion?: number;
  reason?: string;
};

const syncLocks = new Set<string>();

export async function isOnlineNow() {
  const state = await NetInfo.fetch();

  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

function getProjectLocalVersion(project: any, syncStateVersion?: number) {
  const stateVersion = Number(syncStateVersion || 0);
  const projectVersion = Number(project?.syncVersion || 0);

  return Math.max(stateVersion, projectVersion);
}

export async function markProjectNeedsSync(projectId: string) {
  if (!projectId) return;

  const localState = await getProjectSyncState(projectId);
  const downloadedProject = await getDownloadedProject(projectId);

  await saveProjectSyncState({
    projectId,
    syncVersion: getProjectLocalVersion(
      downloadedProject,
      localState?.syncVersion
    ),
    needsSync: true,
    lastSyncAt: localState?.lastSyncAt || null,
  });
}

export async function queueProjectSync(input: QueueProjectSyncInput) {
  if (!input.projectId) return;

  const online = await isOnlineNow();

  if (!online) {
    await markProjectNeedsSync(input.projectId);
    return;
  }

  await syncSingleProject(input.projectId, {
    uploadPendingFirst: true,
  });
}

export async function syncSingleProject(
  projectId: string,
  options: {
    uploadPendingFirst?: boolean;
  } = {}
) {
  if (!projectId) return;

  if (syncLocks.has(projectId)) {
    console.log("[project-sync] already syncing project", projectId);
    return;
  }

  syncLocks.add(projectId);

  try {
    const online = await isOnlineNow();

    if (!online) {
      await markProjectNeedsSync(projectId);
      return;
    }

    if (options.uploadPendingFirst !== false) {
  const queueResult = await syncQueue();

  if (queueResult.failed > 0 || queueResult.pending > 0) {
    await markProjectNeedsSync(projectId);
    return;
  }
}

    const localState = await getProjectSyncState(projectId);
    const downloadedProject = await getDownloadedProject(projectId);

    const localVersion = getProjectLocalVersion(
      downloadedProject,
      localState?.syncVersion
    );

    const manifest = await projectApi.offlineManifest(projectId);
    const serverVersion = Number(manifest.syncVersion || 1);

    if (localVersion >= serverVersion) {
      await saveProjectSyncState({
        projectId,
        syncVersion: serverVersion,
        needsSync: false,
        lastSyncAt: new Date().toISOString(),
      });

      return;
    }

    const changes = await projectApi.offlineChanges(projectId, localVersion);

    if (!changes.hasChanges) {
      await saveProjectSyncState({
        projectId,
        syncVersion: Number(changes.syncVersion || serverVersion),
        needsSync: false,
        lastSyncAt: new Date().toISOString(),
      });

      return;
    }

    if (changes.project) {
      await saveProjectOffline({
        ...changes.project,
        syncVersion: Number(changes.syncVersion || serverVersion),
        lastSyncedChangeAt:
          changes.lastSyncedChangeAt ||
          changes.project.lastSyncedChangeAt ||
          changes.project.updatedAt ||
          null,
      });
    }

    await clearOfflineProjectContents(projectId);

    await saveFoldersOffline(changes.folders || []);
    await saveAssetsOffline(changes.assets || []);

    await deleteOfflineFoldersByIds(changes.deletedFolders || []);
    await deleteOfflineAssetsByIds(changes.deletedAssets || []);

    await saveProjectSyncState({
      projectId,
      syncVersion: Number(changes.syncVersion || serverVersion),
      needsSync: false,
      lastSyncAt: new Date().toISOString(),
    });

    console.log("[project-sync] synced", projectId);
  } catch (error) {
    console.log("[project-sync] failed", projectId, error);

    await markProjectNeedsSync(projectId);
  } finally {
    syncLocks.delete(projectId);
  }
}

export async function syncAssignedProjects(projects: Project[]) {
  const online = await isOnlineNow();

  if (!online) {
    for (const project of projects || []) {
      await markProjectNeedsSync(project.id);
    }

    return;
  }

  const queueResult = await syncQueue();

if (queueResult.failed > 0 || queueResult.pending > 0) {
  for (const project of projects || []) {
    await markProjectNeedsSync(project.id);
  }

  return;
}

for (const project of projects || []) {
  await syncSingleProject(project.id, {
    uploadPendingFirst: false,
  });
}
}

export async function syncAssignedProjectsFromApi() {
  const result = await projectApi.list();
  const projects = result.projects || [];

  await syncAssignedProjects(projects);

  return projects;
}