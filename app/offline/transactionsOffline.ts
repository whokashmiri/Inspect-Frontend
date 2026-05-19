import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

const db = SQLite.openDatabaseSync("offline-transactions.db");

export async function initTransactionsOfflineDb() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updatedAt TEXT
    );
  `);
}

export async function saveOfflineTransactions(transactions: any[]) {
  await initTransactionsOfflineDb();

  for (const item of transactions) {
    const id = String(item.id || item._id);

    await db.runAsync(
      `INSERT OR REPLACE INTO offline_transactions (id, data, updatedAt)
       VALUES (?, ?, ?);`,
      [id, JSON.stringify(item), item.updatedAt || new Date().toISOString()]
    );
  }
}

export async function getOfflineTransactions() {
  await initTransactionsOfflineDb();

  const rows = await db.getAllAsync<any>(
    `SELECT data FROM offline_transactions ORDER BY updatedAt DESC;`
  );

  return rows.map((row) => JSON.parse(row.data));
}


function getMediaKey(item: any) {
  return String(
    item.localId ||
      item.serverId ||
      item.id ||
      item._id ||
      item.url ||
      item.localUri ||
      item.uri ||
      item.originalUri ||
      item.name ||
      ""
  );
}

export function dedupeMedia(media: any[]) {
  const map = new Map<string, any>();

  for (const item of media || []) {
    const key = getMediaKey(item);
    if (!key) continue;
    map.set(key, item);
  }

  return Array.from(map.values());
}
export async function getOfflineTransactionById(id: string) {
  await initTransactionsOfflineDb();

  const row = await db.getFirstAsync<any>(
    `SELECT data FROM offline_transactions WHERE id = ?;`,
    [id]
  );

  return row?.data ? JSON.parse(row.data) : null;
}

export async function saveOfflineTransaction(transaction: any) {
  await initTransactionsOfflineDb();

  const id = String(transaction.id || transaction._id);

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_transactions (id, data, updatedAt)
     VALUES (?, ?, ?);`,
    [id, JSON.stringify(transaction), new Date().toISOString()]
  );

  return transaction;
}



export async function initInspectionSyncQueue() {
  await initTransactionsOfflineDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_inspection_sync (
      id TEXT PRIMARY KEY NOT NULL,
      transactionId TEXT NOT NULL,
      data TEXT NOT NULL,
      media TEXT,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  // Migration for old local DBs
  try {
    await db.execAsync(`
      ALTER TABLE pending_inspection_sync ADD COLUMN projectId TEXT;
    `);
  } catch (error: any) {
    // Ignore if column already exists
    if (!String(error?.message || error).includes("duplicate column")) {
      console.log("projectId migration skipped:", error);
    }
  }
}

export async function savePendingInspectionSync({
  transactionId,
   projectId,
  data,
  media = [],
}: {
  transactionId: string;
  projectId?: string;
  data: any;
  media?: any[];
}) {
  await initInspectionSyncQueue();

  const existing = await db.getFirstAsync<any>(
    `SELECT * FROM pending_inspection_sync
     WHERE transactionId = ? AND status = ?;`,
    [transactionId, "pending"]
  );

  const cleanMedia = dedupeMedia(media);

  if (existing) {
    const oldData = JSON.parse(existing.data || "{}");
    const oldMedia = JSON.parse(existing.media || "[]");

    await db.runAsync(
      `UPDATE pending_inspection_sync
       SET data = ?, media = ?, createdAt = ?
       WHERE id = ?;`,
      [
        JSON.stringify({ ...oldData, ...data }),
        JSON.stringify(dedupeMedia([...oldMedia, ...cleanMedia])),
        new Date().toISOString(),
        existing.id,
      ]
    );

    return existing.id;
  }

  const id = `inspection_${transactionId}_${Date.now()}`;

 await db.runAsync(
  `INSERT INTO pending_inspection_sync
   (id, transactionId, projectId, data, media, createdAt, status)
   VALUES (?, ?, ?, ?, ?, ?, ?);`,
  [
    id,
    transactionId,
    projectId ?? null,
    JSON.stringify(data),
    JSON.stringify(cleanMedia),
    new Date().toISOString(),
    "pending",
  ]
);

  return id;
}

export async function saveLocalInspectionMedia(
  transactionId: string,
  media: any[]
) {
  const baseDir = `${FileSystem.documentDirectory}transactions-media/${transactionId}/`;

  const dirInfo = await FileSystem.getInfoAsync(baseDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  }

  
  const saved = [];

  for (const item of media) {
    const uri = item.uri || item.localUri;

  

    if (!uri) {
      saved.push(item);
      continue;
    }

     
    if (uri.startsWith(FileSystem.documentDirectory || "")) {
      saved.push({
        ...item,
       
        originalUri: item.originalUri || uri,
        uri,
        localUri: item.localUri || uri,
        isLocalOnly: true,
      });
      continue;
    }

    const isVideo =
      item.mediaType === "video" ||
      item.mimeType?.startsWith?.("video") ||
      item.type?.startsWith?.("video");

      const localId = item.localId || `local_${transactionId}_${Date.now()}_${Math.random()
  .toString(36)
  .slice(2)}`;

    const ext = isVideo ? "mp4" : "jpg";
    const fileName = `${localId}.${ext}`;

    const localUri = `${baseDir}${fileName}`;

    await FileSystem.copyAsync({
      from: uri,
      to: localUri,
    });

    saved.push({
      ...item,
      localId,
      originalUri: item.originalUri || uri,
      uri: localUri,
      localUri,
      isLocalOnly: true,
    });
  }

  return dedupeMedia(saved);

}

export async function downloadTransactionMedia(transactions: any[]) {
  const baseDir = `${FileSystem.documentDirectory}transactions-media/`;

  const info = await FileSystem.getInfoAsync(baseDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  }

  const updatedTransactions = [];

  for (const transaction of transactions) {
   const media = dedupeMedia(transaction.media || []);
    const transactionId = String(transaction.id || transaction._id);

    const transactionDir = `${baseDir}${transactionId}/`;
    const dirInfo = await FileSystem.getInfoAsync(transactionDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(transactionDir, { intermediates: true });
    }

    const downloadedMedia = [];

    for (const item of media) {
      try {
        const remoteUrl = item.url;
        if (!remoteUrl) {
          downloadedMedia.push(item);
          continue;
        }

        const ext =
          item.mimeType?.includes("video")
            ? "mp4"
            : item.mimeType?.includes("png")
            ? "png"
            : "jpg";

        const fileName = `${item.id || Date.now()}.${ext}`;
        const localUri = `${transactionDir}${fileName}`;

        const fileInfo = await FileSystem.getInfoAsync(localUri);

        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(remoteUrl, localUri);
        }

        downloadedMedia.push({
          ...item,
          localUri,
        });
      } catch (error) {
        console.log("Media download failed:", error);
        downloadedMedia.push(item);
      }
    }

    updatedTransactions.push({
      ...transaction,
       media: dedupeMedia(downloadedMedia),
  imagesCount: dedupeMedia(downloadedMedia).length,
      isOfflineDownloaded: true,
    });
  }

  await saveOfflineTransactions(updatedTransactions);

  return updatedTransactions;
}


export async function getPendingInspectionSyncItems() {
  await initInspectionSyncQueue();

  return db.getAllAsync<any>(
    `SELECT * FROM pending_inspection_sync WHERE status = ? ORDER BY createdAt ASC;`,
    ["pending"]
  );
}

export async function getPendingInspectionSyncCount() {
  await initInspectionSyncQueue();

  const row = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as count FROM pending_inspection_sync WHERE status = ?;`,
    ["pending"]
  );

  return Number(row?.count || 0);
}

export async function markInspectionSyncDone(id: string) {
  await initInspectionSyncQueue();

  await db.runAsync(
    `UPDATE pending_inspection_sync SET status = ? WHERE id = ?;`,
    ["done", id]
  );
}