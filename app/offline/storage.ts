

//offline/storage.ts

import { runDbTask } from "./dbQueue";
import {
  PendingItem,
  OfflineProjectRecord,
} from "./types";

import {
  offlineDb as db,
  configureOfflineDb,
} from "./database";

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
let initializationPromise: Promise<void> | null = null;


export function initStorage(): Promise<void> {
  if (initialized) {
    return Promise.resolve();
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    // Shared DB configuration first.
    await configureOfflineDb();

    // All schema/migration work serialized.
    await runDbTask(async () => {
      if (initialized) {
        return;
      }

      try {
        // KEEP ALL YOUR EXISTING
        // CREATE TABLE / ALTER TABLE /
        // migration code here unchanged.

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

        // ...keep the rest of your existing init code...

        initialized = true;

        console.log(
          "✅ Offline storage initialized",
        );
      } catch (error) {
        initialized = false;

        console.error(
          "Storage init failed:",
          error,
        );

        throw error;
      }
    });
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

function normalizeFolderParent(folder: any): string | null {
  return folder.parentId ?? folder.parent ?? null;
}

function normalizeAssetFolder(asset: any): string | null {
  return asset.folderId ?? asset.parent ?? null;
}


function getNestedRawDataValue(rawData: any, key?: string | null) {
  if (!rawData || !key) return rawData;

  return key.split(".").reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, rawData);
}



function normalizeText(value: any): string | null {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeCondition(value: any): string | null {
  return normalizeText(value);
}

function normalizeSubAssetTypeValue(value: any): string | null {
  const text = String(value || "").trim().toLowerCase();
  return text || null;
}

function normalizeOfflineAsset(asset: any) {
  const assetType =
    String(asset?.assetType || "")
      .trim()
      .toLowerCase() === "vehicle"
      ? "vehicle"
      : "other";

  const condition =
    normalizeCondition(asset?.condition) || "Good";

  const subAssetType =
    assetType === "vehicle"
      ? "vehicle"
      : normalizeSubAssetTypeValue(
          asset?.subAssetType ??
            asset?.rawData?.subAssetType ??
            asset?.rawData?.customAssetType,
        );

  const rawData =
    asset?.rawData &&
    typeof asset.rawData === "object" &&
    !Array.isArray(asset.rawData)
      ? { ...asset.rawData }
      : {};

  delete rawData.quantity;
  delete rawData.subAssetType;
  delete rawData.customAssetType;

  return {
    ...asset,

    id: String(asset?.id || asset?._id || ""),

    projectId: String(
      asset?.projectId || "",
    ),

    folderId:
      asset?.folderId ??
      asset?.parent ??
      null,

    parent:
      asset?.parent ??
      asset?.folderId ??
      null,

    assetType,
    condition,
    subAssetType,

    val_tech_id:
      typeof asset?.val_tech_id === "number"
        ? asset.val_tech_id
        : null,

    client_code:
      normalizeText(asset?.client_code),

    code:
      normalizeText(asset?.code),

    employer:
      normalizeText(asset?.employer),

    asset_source:
      normalizeText(asset?.asset_source),

    createdBy:
      asset?.createdBy ?? null,

    updatedBy:
      asset?.updatedBy ?? null,

    createdAt:
      asset?.createdAt ?? null,

    updatedAt:
      asset?.updatedAt ?? null,

    rawData,
  };
}


function rawDataValueMatches(value: any, search: string): boolean {
  if (value === null || value === undefined) return false;

  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).toLowerCase().includes(needle);
  }

  if (Array.isArray(value)) {
    return value.some((item) => rawDataValueMatches(item, search));
  }

  if (typeof value === "object") {
    return Object.values(value).some((item) =>
      rawDataValueMatches(item, search)
    );
  }

  return false;
}

function extractRawDataKeys(obj: any, prefix = "", keys = new Set<string>()) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return keys;

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);

    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      extractRawDataKeys(value, fullKey, keys);
    }
  }

  return keys;
}


export async function getOfflineRawDataKeys(projectId: string): Promise<string[]> {
  await initStorage();

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM offline_assets WHERE projectId = ?;`,
    [projectId]
  );

  const keys = new Set<string>();

  for (const row of rows) {
    try {
      const asset = JSON.parse(row.data);
      extractRawDataKeys(asset.rawData, "", keys);
    } catch {
      // ignore malformed row
    }
  }

  return Array.from(keys).sort();
}


export async function advancedSearchOfflineAssets({
  projectId,
  key,
  search,
  filter = "all",
  page = 1,
  limit = 15,
}: {
  projectId: string;
  key?: string | null;
  search: string;
  filter?: "all" | "done" | "incomplete";
  page?: number;
  limit?: number;
}): Promise<{
  folders: any[];
  assets: any[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}> {
  await initStorage();

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM offline_assets
     WHERE projectId = ?
     ORDER BY id DESC;`,
    [projectId]
  );

  let assets = rows
    .map((row) => {
      try {
        return normalizeOfflineAsset(JSON.parse(row.data));
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (filter === "done") {
    assets = assets.filter((asset) => asset.isDone === true);
  }

  if (filter === "incomplete") {
    assets = assets.filter((asset) => asset.isDone !== true);
  }

  const query = search.trim();

  if (query) {
    assets = assets.filter((asset) => {
      const value = key
        ? getNestedRawDataValue(asset.rawData, key)
        : asset.rawData;

      return rawDataValueMatches(value, query);
    });
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;
  const paginatedAssets = assets.slice(start, start + safeLimit);

  return {
    folders: [],
    assets: paginatedAssets,
    page: safePage,
    limit: safeLimit,
    total: assets.length,
    hasMore: start + safeLimit < assets.length,
  };
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

  await runDbTask(() =>
    db.runAsync(
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
    )
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

  await runDbTask(() =>
    db.runAsync(
      `UPDATE pending_queue
       SET status = ?,
           retryCount = COALESCE(?, retryCount),
           lastAttempt = ?
       WHERE id = ?;`,
      [status, retryCount ?? null, lastAttempt ?? null, id]
    )
  );
}


export async function deletePending(id: string): Promise<void> {
  await initStorage();

  await runDbTask(() =>
    db.runAsync(`DELETE FROM pending_queue WHERE id = ?;`, [id])
  );
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

export async function updatePayload(
  id: string,
  payload: Record<string, any>
): Promise<void> {
  await initStorage();

  await runDbTask(() =>
    db.runAsync(`UPDATE pending_queue SET payload = ? WHERE id = ?;`, [
      JSON.stringify(payload),
      id,
    ])
  );
}



export async function getPendingAssetItemId(
  assetId: string,
  projectId?: string
): Promise<string | null> {
  await initStorage();

  const rows = await db.getAllAsync<{ id: string; type: string; payload: string }>(
    `SELECT id, type, payload FROM pending_queue 
     WHERE status = 'pending' AND (type = 'updateAsset' OR type = 'createAsset')
     ${projectId ? "AND projectId = ?" : ""}
     ORDER BY createdAt DESC;`,
    projectId ? [projectId] : []
  );

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload);

      if (
        row.id === assetId ||
        payload?.assetId === assetId ||
        payload?.localId === assetId ||
        payload?.offlineId === assetId
      ) {
        return row.id;
      }
    } catch {
      // ignore malformed rows
    }
  }

  return null;
}


export async function getPendingAssetItem(
  assetId: string,
  projectId?: string
): Promise<PendingItem | null> {
  await initStorage();

  const rows = await db.getAllAsync<PendingQueueRow>(
    `SELECT * FROM pending_queue 
     WHERE status = 'pending' AND (type = 'updateAsset' OR type = 'createAsset')
     ${projectId ? "AND projectId = ?" : ""}
     ORDER BY createdAt DESC;`,
    projectId ? [projectId] : []
  );

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload);

      if (
        row.id === assetId ||
        payload?.assetId === assetId ||
        payload?.localId === assetId ||
        payload?.offlineId === assetId
      ) {
        return {
          id: row.id,
          type: row.type,
          payload,
          projectId: row.projectId ?? undefined,
          localMediaUris: row.localMediaUris ? JSON.parse(row.localMediaUris) : [],
          createdAt: Number(row.createdAt),
          status: row.status,
          retryCount: Number(row.retryCount ?? 0),
          lastAttempt:
            row.lastAttempt === null || row.lastAttempt === undefined
              ? null
              : Number(row.lastAttempt),
        };
      }
    } catch {}
  }

  return null;
}
/* -------------------- Offline downloaded project cache -------------------- */

export async function saveProjectOffline(project: any) {
  await initStorage();

  await runDbTask(() =>
    db.runAsync(
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
    )
  );
}


export async function saveFoldersOffline(
  folders: Array<{
    id: string;
    projectId: string;
    parentId?: string | null;
    parent?: string | null;
    [key: string]: any;
  }>
) {
  await initStorage();

  await runDbTask(async () => {
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
  });
}

export async function saveAssetsOffline(
  assets: Array<{
    id: string;
    projectId: string;
    folderId?: string | null;
    parent?: string | null;
    [key: string]: any;
  }>
) {
  await initStorage();

  await runDbTask(async () => {
    for (const asset of assets) {
      const folderId = normalizeAssetFolder(asset);

     const normalizedAsset = normalizeOfflineAsset({
  ...asset,
  folderId,
});

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
  });
}

export async function replaceOfflineProjectSnapshot({
  project,
  folders,
  assets,
}: {
  project: {
    id: string;
    companyId?: string | null;
    userId?: string | null;
    [key: string]: any;
  };
  folders: Array<{
    id: string;
    projectId: string;
    parentId?: string | null;
    parent?: string | null;
    [key: string]: any;
  }>;
  assets: Array<{
    id: string;
    projectId: string;
    folderId?: string | null;
    parent?: string | null;
    [key: string]: any;
  }>;
}): Promise<void> {
  await initStorage();

  const projectId = String(project?.id || "").trim();

  if (!projectId) {
    throw new Error(
      "Cannot replace offline project snapshot without a project ID.",
    );
  }

  const normalizedFolders = folders.map((folder) => {
    const parentId = normalizeFolderParent(folder);

    return {
      ...folder,
      projectId:
        String(folder.projectId || projectId),
      parentId,
    };
  });

  const normalizedAssets = assets.map((asset) => {
    const folderId = normalizeAssetFolder(asset);

    return normalizeOfflineAsset({
      ...asset,
      projectId:
        String(asset.projectId || projectId),
      folderId,
    });
  });

  await runDbTask(async () => {
    await db.withTransactionAsync(async () => {
      /*
       * Remove only the current project's previous snapshot.
       *
       * pending_queue is intentionally NOT touched.
       * project_sync_state is intentionally NOT touched.
       */
      await db.runAsync(
        `DELETE FROM offline_folders WHERE projectId = ?;`,
        [projectId],
      );

      await db.runAsync(
        `DELETE FROM offline_assets WHERE projectId = ?;`,
        [projectId],
      );

      await db.runAsync(
        `DELETE FROM offline_projects WHERE id = ?;`,
        [projectId],
      );

      /*
       * Save project.
       */
      await db.runAsync(
        `
          INSERT INTO offline_projects
          (
            id,
            companyId,
            userId,
            data,
            downloadedAt
          )
          VALUES (?, ?, ?, ?, ?);
        `,
        [
          projectId,
          project.companyId ?? null,
          project.userId ?? null,
          JSON.stringify({
            ...project,
            id: projectId,
          }),
          Date.now(),
        ],
      );

      /*
       * Save folders.
       */
      for (const folder of normalizedFolders) {
        const folderId =
          String(folder?.id || "").trim();

        if (!folderId) {
          throw new Error(
            "Cannot save offline folder without an ID.",
          );
        }

        await db.runAsync(
          `
            INSERT INTO offline_folders
            (
              id,
              projectId,
              parentId,
              data
            )
            VALUES (?, ?, ?, ?);
          `,
          [
            folderId,
            projectId,
            folder.parentId ?? null,
            JSON.stringify({
              ...folder,
              id: folderId,
              projectId,
            }),
          ],
        );
      }

      /*
       * Save assets.
       */
      for (const asset of normalizedAssets) {
        const assetId =
          String(asset?.id || "").trim();

        if (!assetId) {
          throw new Error(
            "Cannot save offline asset without an ID.",
          );
        }

        const folderId =
          normalizeAssetFolder(asset);

        await db.runAsync(
          `
            INSERT INTO offline_assets
            (
              id,
              projectId,
              folderId,
              data
            )
            VALUES (?, ?, ?, ?);
          `,
          [
            assetId,
            projectId,
            folderId,
            JSON.stringify({
              ...asset,
              id: assetId,
              projectId,
              folderId,
              parent:
                asset.parent ??
                folderId ??
                null,
            }),
          ],
        );
      }
    });
  });
}

export async function clearOfflineProjectContents(projectId: string): Promise<void> {
  await initStorage();

  await runDbTask(async () => {
    await db.runAsync(`DELETE FROM offline_folders WHERE projectId = ?;`, [
      projectId,
    ]);

    await db.runAsync(`DELETE FROM offline_assets WHERE projectId = ?;`, [
      projectId,
    ]);
  });
}

export async function clearOfflineProject(projectId: string): Promise<void> {
  await initStorage();
 await runDbTask(async ()=> {
  await db.runAsync(`DELETE FROM offline_projects WHERE id = ?;`, [projectId]);
  await db.runAsync(`DELETE FROM offline_folders WHERE projectId = ?;`, [projectId]);
  await db.runAsync(`DELETE FROM offline_assets WHERE projectId = ?;`, [projectId]);
 });
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
  assets: assetRows.map((row) => normalizeOfflineAsset(JSON.parse(row.data))),
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

  await runDbTask(() =>
    db.runAsync(
      `INSERT OR REPLACE INTO offline_folders (id, projectId, parentId, data)
       VALUES (?, ?, ?, ?);`,
      [folder.id, folder.projectId, parentId, JSON.stringify(normalizedFolder)]
    )
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
  const normalizedAsset = normalizeOfflineAsset({
  ...asset,
  folderId,
});

    await runDbTask(() =>
      db.runAsync(
        `INSERT OR REPLACE INTO offline_assets (id, projectId, folderId, data)
         VALUES (?, ?, ?, ?);`,
        [asset.id, asset.projectId, folderId, JSON.stringify(normalizedAsset)]
      )
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
    return normalizeOfflineAsset(JSON.parse(row.data));
  } catch (error) {
    console.error("Error getting offline asset by ID:", error);
    return null;
  }
}

export async function getOfflineSubAssetTypes(projectId: string): Promise<string[]> {
  await initStorage();

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM offline_assets WHERE projectId = ?;`,
    [projectId]
  );

  const unique = new Set<string>();

  for (const row of rows) {
    try {
      const asset = normalizeOfflineAsset(JSON.parse(row.data));

      if (asset.assetType !== "other") continue;

      const value = normalizeSubAssetTypeValue(asset.subAssetType);

      if (value) {
        unique.add(value);
      }
    } catch {
      // ignore malformed row
    }
  }

  return Array.from(unique).sort((a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );
}

export async function getOfflineConditions(projectId: string): Promise<string[]> {
  await initStorage();

  const defaultConditions = [
    "New",
    "Excellent",
    "Good",
    "Very Good",
    "Acceptable",
    "Poor",
    "Scrape",
  ];

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM offline_assets WHERE projectId = ?;`,
    [projectId]
  );

  const unique = new Map<string, string>();

  for (const item of defaultConditions) {
    unique.set(item.toLowerCase(), item);
  }

  for (const row of rows) {
    try {
      const asset = normalizeOfflineAsset(JSON.parse(row.data));
      const value = normalizeCondition(asset.condition);

      if (value) {
        unique.set(value.toLowerCase(), value);
      }
    } catch {
      // ignore malformed row
    }
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );
}


export async function renameOfflineSubAssetType({
  projectId,
  oldSubAssetType,
  newSubAssetType,
  parent,
}: {
  projectId: string;
  oldSubAssetType: string;
  newSubAssetType: string;
  parent?: string | null;
}): Promise<{
  success: boolean;
  matchedCount: number;
  modifiedCount: number;
  oldSubAssetType: string;
  newSubAssetType: string;
}> {
  await initStorage();

  const oldValue = normalizeSubAssetTypeValue(oldSubAssetType);
  const newValue = normalizeSubAssetTypeValue(newSubAssetType);

  if (!oldValue) {
    throw new Error("Old sub asset type is required");
  }

  if (!newValue) {
    throw new Error("New sub asset type is required");
  }

  const rows = await db.getAllAsync<{
    id: string;
    folderId: string | null;
    data: string;
  }>(
    parent === undefined
      ? `SELECT id, folderId, data FROM offline_assets WHERE projectId = ?;`
      : parent === null
      ? `SELECT id, folderId, data FROM offline_assets WHERE projectId = ? AND folderId IS NULL;`
      : `SELECT id, folderId, data FROM offline_assets WHERE projectId = ? AND folderId = ?;`,
    parent === undefined ? [projectId] : parent === null ? [projectId] : [projectId, parent]
  );

  let matchedCount = 0;
  let modifiedCount = 0;

  await runDbTask(async () => {
    for (const row of rows) {
      let asset: any;

      try {
        asset = normalizeOfflineAsset(JSON.parse(row.data));
      } catch {
        continue;
      }

      if (asset.assetType === "vehicle") continue;

      const current = normalizeSubAssetTypeValue(asset.subAssetType);

      if (current !== oldValue) continue;

      matchedCount += 1;

      const updatedAsset = normalizeOfflineAsset({
        ...asset,
        subAssetType: newValue,
      });

      await db.runAsync(
        `UPDATE offline_assets SET data = ? WHERE id = ?;`,
        [JSON.stringify(updatedAsset), row.id]
      );

      modifiedCount += 1;
    }
  });

  return {
    success: true,
    matchedCount,
    modifiedCount,
    oldSubAssetType: oldValue,
    newSubAssetType: newValue,
  };
}


export async function getProjectSyncState(projectId: string): Promise<{
  projectId: string;
  syncVersion: number;
  needsSync: boolean;
  lastSyncAt: string | null;
} | null> {
  await initStorage();

  const row = await db.getFirstAsync<{
    projectId: string;
    syncVersion: number | string;
    needsSync: number | string;
    lastSyncAt: string | null;
  }>(
    `SELECT projectId, syncVersion, needsSync, lastSyncAt
     FROM project_sync_state
     WHERE projectId = ?;`,
    [projectId]
  );

  if (!row) return null;

  return {
    projectId: row.projectId,
    syncVersion: Number(row.syncVersion || 0),
    needsSync: Number(row.needsSync || 0) === 1,
    lastSyncAt: row.lastSyncAt ?? null,
  };
}

export async function saveProjectSyncState(state: {
  projectId: string;
  syncVersion: number;
  needsSync: boolean;
  lastSyncAt?: string | null;
}): Promise<void> {
  await initStorage();

  await runDbTask(() =>
    db.runAsync(
      `INSERT OR REPLACE INTO project_sync_state
       (projectId, syncVersion, needsSync, lastSyncAt)
       VALUES (?, ?, ?, ?);`,
      [
        state.projectId,
        Number(state.syncVersion || 0),
        state.needsSync ? 1 : 0,
        state.lastSyncAt ?? null,
      ]
    )
  );
}

export async function getProjectsNeedingSync(): Promise<string[]> {
  await initStorage();

  const rows = await db.getAllAsync<{ projectId: string }>(
    `SELECT projectId
     FROM project_sync_state
     WHERE needsSync = 1;`
  );

  return rows.map((row) => row.projectId);
}

export async function deleteOfflineFoldersByIds(folderIds: string[]): Promise<void> {
  if (!folderIds.length) return;

  await initStorage();

  await runDbTask(async () => {
    for (const id of folderIds) {
      await db.runAsync(`DELETE FROM offline_folders WHERE id = ?;`, [id]);
    }
  });
}

export async function deleteOfflineAssetsByIds(assetIds: string[]): Promise<void> {
  if (!assetIds.length) return;

  await initStorage();

  await runDbTask(async () => {
    for (const id of assetIds) {
      await db.runAsync(`DELETE FROM offline_assets WHERE id = ?;`, [id]);
    }
  });
}


export async function deletePendingCreateAssetByLocalId(
  localAssetId: string,
): Promise<void> {
  const pendingItems =
    await getPending("pending");

  for (const item of pendingItems) {
    if (item.type !== "createAsset") {
      continue;
    }

    const payload = item.payload || {};

    const matches =
      // item.localId === localAssetId ||
      payload.localId === localAssetId ||
      payload.clientMutationId ===
        localAssetId;

    if (matches) {
      await deletePending(item.id);
    }
  }
}