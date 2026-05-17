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