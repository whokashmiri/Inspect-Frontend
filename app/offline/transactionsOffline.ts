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
}

export async function savePendingInspectionSync({
  transactionId,
  data,
  media = [],
}: {
  transactionId: string;
  data: any;
  media?: any[];
}) {
  await initInspectionSyncQueue();

  const id = `inspection_${transactionId}_${Date.now()}`;

  await db.runAsync(
    `INSERT INTO pending_inspection_sync
     (id, transactionId, data, media, createdAt, status)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      id,
      transactionId,
      JSON.stringify(data),
      JSON.stringify(media),
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
      saved.push(item);
      continue;
    }

    const isVideo =
      item.mediaType === "video" ||
      item.mimeType?.startsWith?.("video") ||
      item.type?.startsWith?.("video");

    const ext = isVideo ? "mp4" : "jpg";
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const localUri = `${baseDir}${fileName}`;

    await FileSystem.copyAsync({
      from: uri,
      to: localUri,
    });

    saved.push({
      ...item,
      uri: localUri,
      localUri,
      isLocalOnly: true,
    });
  }

  return saved;
}

export async function downloadTransactionMedia(transactions: any[]) {
  const baseDir = `${FileSystem.documentDirectory}transactions-media/`;

  const info = await FileSystem.getInfoAsync(baseDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  }

  const updatedTransactions = [];

  for (const transaction of transactions) {
    const media = transaction.media || [];
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
      media: downloadedMedia,
      isOfflineDownloaded: true,
    });
  }

  await saveOfflineTransactions(updatedTransactions);

  return updatedTransactions;
}