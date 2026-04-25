import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import {
  PendingItem,
  OfflineProjectRecord,
  OfflineFolderRecord,
  OfflineAssetRecord,
} from "./types";

const DB_NAME = Platform.select({
  ios: "offline-queue.db",
  default: "offline-queue.db",
})!;

const db = SQLite.openDatabaseSync(DB_NAME);

type PendingQueueRow = {
  id: string;
  type: PendingItem["type"];
  payload: string;
  projectId: string | null;
  localMediaUris: string | null;
  createdAt: number | string;
  status: PendingItem["status"];
  retryCount: number | string;
  lastAttempt: number | string | null;
};

type JsonRow = {
  data: string;
};

let initialized = false;

function normalizeFolderParent(folder: any): string | null {
  return folder.parentId ?? folder.parent ?? null;
}

function normalizeAssetFolder(asset: any): string | null {
  return asset.folderId ?? asset.parent ?? null;
}

export async function initStorage(): Promise<void> {
  if (initialized) return;

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_queue (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        projectId TEXT,
        localMediaUris TEXT,
        createdAt INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retryCount INTEGER NOT NULL DEFAULT 0,
        lastAttempt INTEGER
      );
    `);

    // ---- migration for older installs: pending_queue ----
    const pendingColumns = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(pending_queue);`
    );
    const pendingColumnNames = pendingColumns.map((c) => c.name);

    if (!pendingColumnNames.includes("projectId")) {
      await db.execAsync(`ALTER TABLE pending_queue ADD COLUMN projectId TEXT;`);
    }

    if (!pendingColumnNames.includes("localMediaUris")) {
      await db.execAsync(`ALTER TABLE pending_queue ADD COLUMN localMediaUris TEXT;`);
    }

    if (!pendingColumnNames.includes("retryCount")) {
      await db.execAsync(
        `ALTER TABLE pending_queue ADD COLUMN retryCount INTEGER NOT NULL DEFAULT 0;`
      );
    }

    if (!pendingColumnNames.includes("lastAttempt")) {
      await db.execAsync(`ALTER TABLE pending_queue ADD COLUMN lastAttempt INTEGER;`);
    }

    if (!pendingColumnNames.includes("status")) {
      await db.execAsync(
        `ALTER TABLE pending_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';`
      );
    }

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pending_queue_status
      ON pending_queue(status);

      CREATE INDEX IF NOT EXISTS idx_pending_queue_projectId
      ON pending_queue(projectId);

      CREATE TABLE IF NOT EXISTS offline_projects (
        id TEXT PRIMARY KEY NOT NULL,
        companyId TEXT,
        userId TEXT,
        data TEXT NOT NULL,
        downloadedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_folders (
        id TEXT PRIMARY KEY NOT NULL,
        projectId TEXT NOT NULL,
        parentId TEXT,
        data TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_offline_folders_projectId
      ON offline_folders(projectId);

      CREATE INDEX IF NOT EXISTS idx_offline_folders_parentId
      ON offline_folders(parentId);

      CREATE TABLE IF NOT EXISTS offline_assets (
        id TEXT PRIMARY KEY NOT NULL,
        projectId TEXT NOT NULL,
        folderId TEXT,
        data TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_offline_assets_projectId
      ON offline_assets(projectId);

      CREATE INDEX IF NOT EXISTS idx_offline_assets_folderId
      ON offline_assets(folderId);
    `);

    // ---- migration for older installs: offline_projects ----
    const projectColumns = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(offline_projects);`
    );
    const projectColumnNames = projectColumns.map((c) => c.name);

    if (!projectColumnNames.includes("companyId")) {
      await db.execAsync(`ALTER TABLE offline_projects ADD COLUMN companyId TEXT;`);
    }

    if (!projectColumnNames.includes("userId")) {
      await db.execAsync(`ALTER TABLE offline_projects ADD COLUMN userId TEXT;`);
    }

    // Backfill old offline_projects rows from stored JSON
    const projectRows = await db.getAllAsync<{
      id: string;
      data: string;
      companyId: string | null;
      userId: string | null;
    }>(`SELECT id, data, companyId, userId FROM offline_projects;`);

    for (const row of projectRows) {
      try {
        const parsed = JSON.parse(row.data);

        const companyId = row.companyId ?? parsed?.companyId ?? null;
        const userId = row.userId ?? parsed?.userId ?? null;

        if (companyId !== row.companyId || userId !== row.userId) {
          await db.runAsync(
            `UPDATE offline_projects SET companyId = ?, userId = ? WHERE id = ?;`,
            [companyId, userId, row.id]
          );
        }
      } catch {
        // ignore malformed rows
      }
    }

    // Backfill old offline_folders rows where parent may be inside JSON as "parent"
    const folderRows = await db.getAllAsync<{
      id: string;
      data: string;
      parentId: string | null;
    }>(`SELECT id, data, parentId FROM offline_folders;`);

    for (const row of folderRows) {
      try {
        const parsed = JSON.parse(row.data);
        const normalizedParentId = row.parentId ?? parsed?.parentId ?? parsed?.parent ?? null;

        if (normalizedParentId !== row.parentId) {
          await db.runAsync(
            `UPDATE offline_folders SET parentId = ? WHERE id = ?;`,
            [normalizedParentId, row.id]
          );
        }
      } catch {
        // ignore malformed rows
      }
    }

    // Backfill old offline_assets rows where folder may be stored as "parent"
    const assetRows = await db.getAllAsync<{
      id: string;
      data: string;
      folderId: string | null;
    }>(`SELECT id, data, folderId FROM offline_assets;`);

    for (const row of assetRows) {
      try {
        const parsed = JSON.parse(row.data);
        const normalizedFolderId = row.folderId ?? parsed?.folderId ?? parsed?.parent ?? null;

        if (normalizedFolderId !== row.folderId) {
          await db.runAsync(
            `UPDATE offline_assets SET folderId = ? WHERE id = ?;`,
            [normalizedFolderId, row.id]
          );
        }
      } catch {
        // ignore malformed rows
      }
    }

    initialized = true;
    console.log("✅ Offline storage initialized");
  } catch (error) {
    console.error("Storage init failed:", error);
    throw error;
  }
}

export async function savePending(
  item: Omit<PendingItem, "status" | "retryCount" | "lastAttempt">
): Promise<string> {
  await initStorage();

  const fullItem: PendingItem = {
    ...item,
    status: "pending",
    retryCount: 0,
    lastAttempt: null,
  };

  await db.runAsync(
    `INSERT OR REPLACE INTO pending_queue
     (id, type, payload, projectId, localMediaUris, createdAt, status, retryCount, lastAttempt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      fullItem.id,
      fullItem.type,
      JSON.stringify(fullItem.payload),
      fullItem.projectId ?? null,
      JSON.stringify(fullItem.localMediaUris ?? []),
      fullItem.createdAt,
      fullItem.status,
      fullItem.retryCount ?? 0,
      fullItem.lastAttempt ?? null,
    ]
  );

  return fullItem.id;
}

export async function getPendingByProjectId(projectId: string): Promise<PendingItem[]> {
  await initStorage();

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM pending_queue WHERE projectId = ? ORDER BY createdAt ASC;`,
    [projectId]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload),
    projectId: row.projectId ?? undefined,
    localMediaUris: row.localMediaUris ? JSON.parse(row.localMediaUris) : [],
    createdAt: Number(row.createdAt),
    status: row.status,
    retryCount: Number(row.retryCount),
    lastAttempt: row.lastAttempt == null ? undefined : Number(row.lastAttempt),
  }));
}

export async function getPendingCountByProjectId(projectId: string): Promise<number> {
  await initStorage();

  const row = await db.getFirstAsync<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM pending_queue WHERE projectId = ? AND status = 'pending';`,
    [projectId]
  );

  return Number(row?.count ?? 0);
}

export async function getPending(
  status: PendingItem["status"] = "pending"
): Promise<PendingItem[]> {
  await initStorage();

  const rows = await db.getAllAsync<PendingQueueRow>(
    `SELECT * FROM pending_queue WHERE status = ? ORDER BY createdAt ASC;`,
    [status]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload),
    projectId: row.projectId ?? undefined,
    localMediaUris: row.localMediaUris ? JSON.parse(row.localMediaUris) : [],
    createdAt: Number(row.createdAt),
    status: row.status,
    retryCount: Number(row.retryCount ?? 0),
    lastAttempt:
      row.lastAttempt === null || row.lastAttempt === undefined
        ? null
        : Number(row.lastAttempt),
  }));
}

export async function updateStatus(
  id: string,
  status: PendingItem["status"],
  retryCount?: number,
  lastAttempt?: number
): Promise<void> {
  await initStorage();

  await db.runAsync(
    `UPDATE pending_queue
     SET status = ?,
         retryCount = COALESCE(?, retryCount),
         lastAttempt = ?
     WHERE id = ?;`,
    [status, retryCount ?? null, lastAttempt ?? null, id]
  );
}

export async function deletePending(id: string): Promise<void> {
  await initStorage();
  await db.runAsync(`DELETE FROM pending_queue WHERE id = ?;`, [id]);
}

export async function getPendingCount(): Promise<number> {
  try {
    await initStorage();

    const result = await db.getFirstAsync<{ count: number | string }>(
      `SELECT COUNT(*) as count FROM pending_queue WHERE status = 'pending';`
    );

    return Number(result?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function updatePayload(id: string, payload: Record<string, any>): Promise<void> {
  await initStorage();

  await db.runAsync(`UPDATE pending_queue SET payload = ? WHERE id = ?;`, [
    JSON.stringify(payload),
    id,
  ]);
}

/* -------------------- Offline downloaded project cache -------------------- */

export async function saveProjectOffline(project: any) {
  await initStorage();

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_projects
     (id, companyId, userId, data, downloadedAt)
     VALUES (?, ?, ?, ?, ?);`,
    [
      project.id,
      project.companyId ?? null,
      project.userId ?? null,
      JSON.stringify(project),
      Date.now(),
    ]
  );
}

export async function saveFoldersOffline(
  folders: Array<{ id: string; projectId: string; parentId?: string | null; parent?: string | null; [key: string]: any }>
) {
  await initStorage();

  for (const folder of folders) {
    const parentId = normalizeFolderParent(folder);

    const normalizedFolder = {
      ...folder,
      parentId,
    };

    await db.runAsync(
      `INSERT OR REPLACE INTO offline_folders (id, projectId, parentId, data)
       VALUES (?, ?, ?, ?);`,
      [
        folder.id,
        folder.projectId,
        parentId,
        JSON.stringify(normalizedFolder),
      ]
    );
  }
}

export async function saveAssetsOffline(
  assets: Array<{ id: string; projectId: string; folderId?: string | null; parent?: string | null; [key: string]: any }>
) {
  await initStorage();

  for (const asset of assets) {
    const folderId = normalizeAssetFolder(asset);

    const normalizedAsset = {
      ...asset,
      folderId,
    };

    await db.runAsync(
      `INSERT OR REPLACE INTO offline_assets (id, projectId, folderId, data)
       VALUES (?, ?, ?, ?);`,
      [
        asset.id,
        asset.projectId,
        folderId,
        JSON.stringify(normalizedAsset),
      ]
    );
  }
}

export async function clearOfflineProject(projectId: string): Promise<void> {
  await initStorage();

  await db.runAsync(`DELETE FROM offline_projects WHERE id = ?;`, [projectId]);
  await db.runAsync(`DELETE FROM offline_folders WHERE projectId = ?;`, [projectId]);
  await db.runAsync(`DELETE FROM offline_assets WHERE projectId = ?;`, [projectId]);
}

export async function isProjectDownloaded(projectId: string): Promise<boolean> {
  await initStorage();

  const row = await db.getFirstAsync<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM offline_projects WHERE id = ?;`,
    [projectId]
  );

  return Number(row?.count ?? 0) > 0;
}

export async function getDownloadedProject(projectId: string) {
  await initStorage();

  const row = await db.getFirstAsync<OfflineProjectRecord>(
    `SELECT * FROM offline_projects WHERE id = ?;`,
    [projectId]
  );

  if (!row) return null;
  return JSON.parse(row.data);
}

export async function getOfflineContents(
  projectId: string,
  parentId: string | null
): Promise<{ folders: any[]; assets: any[] }> {
  await initStorage();

  let folderRows: { data: string }[] = [];
  let assetRows: { data: string }[] = [];

  if (parentId === null) {
    folderRows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM offline_folders
       WHERE projectId = ? AND parentId IS NULL;`,
      [projectId]
    );

    assetRows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM offline_assets
       WHERE projectId = ? AND folderId IS NULL;`,
      [projectId]
    );
  } else {
    folderRows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM offline_folders
       WHERE projectId = ? AND parentId = ?;`,
      [projectId, parentId]
    );

    assetRows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM offline_assets
       WHERE projectId = ? AND folderId = ?;`,
      [projectId, parentId]
    );
  }

  return {
    folders: folderRows.map((row) => JSON.parse(row.data)),
    assets: assetRows.map((row) => JSON.parse(row.data)),
  };
}

export async function getAllDownloadedProjects(): Promise<any[]> {
  await initStorage();

  const rows = await db.getAllAsync<JsonRow>(
    `SELECT data FROM offline_projects ORDER BY downloadedAt DESC;`
  );

  return rows.map((row) => JSON.parse(row.data));
}

export async function getDownloadedProjectsByCompany(companyId: string) {
  await initStorage();

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM offline_projects WHERE companyId = ? ORDER BY downloadedAt DESC;`,
    [companyId]
  );

  return rows.map((row) => JSON.parse(row.data));
}

export async function upsertOfflineFolder(
  folder: {
    id: string;
    projectId: string;
    parentId?: string | null;
    parent?: string | null;
    [key: string]: any;
  }
): Promise<void> {
  await initStorage();

  const parentId = normalizeFolderParent(folder);
  const normalizedFolder = {
    ...folder,
    parentId,
  };

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_folders (id, projectId, parentId, data)
     VALUES (?, ?, ?, ?);`,
    [folder.id, folder.projectId, parentId, JSON.stringify(normalizedFolder)]
  );
}

export async function upsertOfflineAsset(
  asset: {
    id: string;
    projectId: string;
    folderId?: string | null;
    parent?: string | null;
    [key: string]: any;
  }
): Promise<void> {
  try {
    await initStorage();

    const folderId = normalizeAssetFolder(asset);
    const normalizedAsset = {
      ...asset,
      folderId,
    };

    await db.runAsync(
      `INSERT OR REPLACE INTO offline_assets (id, projectId, folderId, data)
       VALUES (?, ?, ?, ?);`,
      [asset.id, asset.projectId, folderId, JSON.stringify(normalizedAsset)]
    );
  } catch (error) {
    console.error("Error upserting offline asset:", error);
    throw error;
  }
}

export async function getOfflineAssetById(assetId: string): Promise<any | null> {
  try {
    await initStorage();

    const row = await db.getFirstAsync<{ data: string }>(
      `SELECT data FROM offline_assets WHERE id = ?;`,
      [assetId]
    );

    if (!row) return null;
    return JSON.parse(row.data);
  } catch (error) {
    console.error("Error getting offline asset by ID:", error);
    return null;
  }
}